import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../config/data-source-options';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Event } from '../entities/event.entity';
import { BookingProcessingService } from './booking-processing.service';

/**
 * Integration test — requires a running PostgreSQL (DATABASE_URL) with
 * migrations applied. Run with `npm run test:integration`.
 *
 * Fires many bookings concurrently against an event with fewer seats than
 * requests and asserts confirmed seats never exceed availability. This is the
 * central overbooking guarantee and is expected to FAIL against the naive
 * check-then-deduct implementation.
 */
describe('BookingProcessingService — overbooking under concurrency', () => {
  let dataSource: DataSource;
  let service: BookingProcessingService;

  beforeAll(async () => {
    dataSource = new DataSource(buildDataSourceOptions(process.env.DATABASE_URL));
    await dataSource.initialize();
    service = new BookingProcessingService(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('never confirms more seats than the event has', async () => {
    const CAPACITY = 5;
    const CONCURRENT = 20;

    const eventRepo = dataSource.getRepository(Event);
    const bookingRepo = dataSource.getRepository(Booking);

    const event = await eventRepo.save(
      eventRepo.create({
        name: 'Concurrency Test Event',
        date: new Date('2027-01-01T00:00:00Z'),
        totalSeats: CAPACITY,
        availableSeats: CAPACITY,
        priceCents: 1000,
      }),
    );

    const bookings = await bookingRepo.save(
      Array.from({ length: CONCURRENT }, (_, i) =>
        bookingRepo.create({
          requestId: `concurrency-${event.id}-${i}`,
          eventId: event.id,
          customerName: `Customer ${i}`,
          customerEmail: `c${i}@example.com`,
          seats: 1,
          status: BookingStatus.PENDING,
        }),
      ),
    );

    try {
      // Process all bookings at once.
      await Promise.all(bookings.map((booking) => service.processBooking(booking.id)));

      const refreshed = await eventRepo.findOneByOrFail({ id: event.id });
      const confirmed = await bookingRepo.count({
        where: { eventId: event.id, status: BookingStatus.CONFIRMED },
      });
      const failed = await bookingRepo.count({
        where: { eventId: event.id, status: BookingStatus.FAILED },
      });

      // The core guarantee: availability never goes negative and confirmed
      // seats never exceed capacity.
      expect(refreshed.availableSeats).toBeGreaterThanOrEqual(0);
      expect(confirmed).toBe(CAPACITY);
      expect(confirmed + failed).toBe(CONCURRENT);
      expect(refreshed.availableSeats).toBe(CAPACITY - confirmed);
    } finally {
      await bookingRepo.delete({ eventId: event.id });
      await eventRepo.delete({ id: event.id });
    }
  }, 30000);

  it('deducts a single booking exactly once even when processed concurrently', async () => {
    // Simulates BullMQ at-least-once re-delivery handing the SAME booking to
    // several worker slots at once. Seats must be deducted only once.
    const CONCURRENT = 8;
    const eventRepo = dataSource.getRepository(Event);
    const bookingRepo = dataSource.getRepository(Booking);

    const event = await eventRepo.save(
      eventRepo.create({
        name: 'Same-Booking Concurrency Test',
        date: new Date('2027-03-01T00:00:00Z'),
        totalSeats: 10,
        availableSeats: 10,
        priceCents: 100,
      }),
    );
    const booking = await bookingRepo.save(
      bookingRepo.create({
        requestId: `same-booking-${event.id}`,
        eventId: event.id,
        customerName: 'Same Booking',
        customerEmail: 'same@example.com',
        seats: 1,
        status: BookingStatus.PENDING,
      }),
    );

    try {
      await Promise.all(
        Array.from({ length: CONCURRENT }, () => service.processBooking(booking.id)),
      );

      const refreshedEvent = await eventRepo.findOneByOrFail({ id: event.id });
      const refreshedBooking = await bookingRepo.findOneByOrFail({ id: booking.id });

      expect(refreshedBooking.status).toBe(BookingStatus.CONFIRMED);
      expect(refreshedEvent.availableSeats).toBe(9); // 10 - 1, deducted once only
    } finally {
      await bookingRepo.delete({ eventId: event.id });
      await eventRepo.delete({ id: event.id });
    }
  }, 30000);
});
