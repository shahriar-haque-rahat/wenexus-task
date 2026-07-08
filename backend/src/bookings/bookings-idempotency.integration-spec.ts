import 'dotenv/config';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../config/data-source-options';
import { Booking } from '../entities/booking.entity';
import { Event } from '../entities/event.entity';
import { ProcessBookingJobData } from './bookings.constants';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

/**
 * Integration test — requires a running PostgreSQL (DATABASE_URL) with
 * migrations applied. Run with `npm run test:integration`.
 *
 * Verifies that submitting the same requestId twice never creates a second
 * booking (nor a second queue job).
 */
describe('BookingsService — idempotent requestId handling', () => {
  let dataSource: DataSource;
  let service: BookingsService;
  let queueAdd: jest.Mock;

  beforeAll(async () => {
    dataSource = new DataSource(buildDataSourceOptions(process.env.DATABASE_URL));
    await dataSource.initialize();
    queueAdd = jest.fn().mockResolvedValue(undefined);
    const fakeQueue = { add: queueAdd } as unknown as Queue<ProcessBookingJobData>;
    service = new BookingsService(
      dataSource.getRepository(Booking),
      dataSource.getRepository(Event),
      fakeQueue,
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('returns the existing booking and does not create a second one for a duplicate requestId', async () => {
    const eventRepo = dataSource.getRepository(Event);
    const bookingRepo = dataSource.getRepository(Booking);

    const event = await eventRepo.save(
      eventRepo.create({
        name: 'Idempotency Test Event',
        date: new Date('2027-02-01T00:00:00Z'),
        totalSeats: 10,
        availableSeats: 10,
        priceCents: 500,
      }),
    );

    const requestId = `idem-${event.id}`;
    const dto: CreateBookingDto = {
      requestId,
      eventId: event.id,
      customerName: 'Dup Customer',
      customerEmail: 'dup@example.com',
      seats: 1,
    };

    try {
      const first = await service.create(dto);
      const second = await service.create(dto);

      expect(second.id).toBe(first.id);

      // The core guarantee: exactly one booking row for the requestId.
      const count = await bookingRepo.count({ where: { requestId } });
      expect(count).toBe(1);

      // A still-PENDING duplicate may be re-enqueued (lost-job recovery), but
      // every enqueue targets the SAME jobId, so BullMQ never creates a second
      // distinct job.
      const jobIds = new Set(queueAdd.mock.calls.map((call) => call[2]?.jobId));
      expect([...jobIds]).toEqual([first.id]);
    } finally {
      await bookingRepo.delete({ requestId });
      await eventRepo.delete({ id: event.id });
    }
  }, 30000);
});
