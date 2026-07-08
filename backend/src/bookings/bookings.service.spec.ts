import { NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Event } from '../entities/event.entity';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';

type MockRepo<T> = Pick<Repository<T>, 'findOne'> & {
  create: jest.Mock;
  save: jest.Mock;
  findAndCount: jest.Mock;
};

const REQUEST_ID = 'server-generated-uuid';

const dto: CreateBookingDto = {
  eventId: 1,
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  seats: 2,
};

function makeBooking(overrides: Partial<Booking>): Booking {
  return {
    id: 'booking-uuid',
    requestId: REQUEST_ID,
    eventId: dto.eventId,
    customerName: dto.customerName,
    customerEmail: dto.customerEmail,
    seats: dto.seats,
    status: BookingStatus.PENDING,
    failureReason: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    event: undefined as unknown as Event,
    ...overrides,
  } as Booking;
}

describe('BookingsService (unit)', () => {
  let service: BookingsService;
  let bookingsRepo: MockRepo<Booking>;
  let eventsRepo: MockRepo<Event>;
  let queue: { add: jest.Mock };

  beforeEach(() => {
    bookingsRepo = {
      findOne: jest.fn(),
      create: jest.fn((x: Partial<Booking>) => x as Booking),
      save: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    eventsRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new BookingsService(
      bookingsRepo as unknown as Repository<Booking>,
      eventsRepo as unknown as Repository<Event>,
      queue as unknown as Queue,
    );
  });

  it('throws 404 when the event does not exist', async () => {
    bookingsRepo.findOne.mockResolvedValue(null);
    eventsRepo.findOne.mockResolvedValue(null);

    await expect(service.create(dto, REQUEST_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(bookingsRepo.save).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('creates a PENDING booking and enqueues it for a new requestId', async () => {
    bookingsRepo.findOne.mockResolvedValue(null);
    eventsRepo.findOne.mockResolvedValue({ id: 1 } as Event);
    bookingsRepo.save.mockResolvedValue(makeBooking({ id: 'new-uuid' }));

    const result = await service.create(dto, REQUEST_ID);

    expect(result.bookingReference).toBe('new-uuid');
    expect(result.status).toBe(BookingStatus.PENDING);
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      { bookingId: 'new-uuid' },
      { jobId: 'new-uuid' },
    );
  });

  it('returns the existing booking without inserting or enqueuing when a matching fingerprint exists within 30s', async () => {
    bookingsRepo.findOne.mockResolvedValue(
      makeBooking({ id: 'existing-uuid', status: BookingStatus.CONFIRMED }),
    );

    const result = await service.create(dto, REQUEST_ID);

    expect(result.bookingReference).toBe('existing-uuid');
    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(bookingsRepo.save).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('re-enqueues an existing PENDING booking to recover a possibly-lost job', async () => {
    bookingsRepo.findOne.mockResolvedValue(
      makeBooking({ id: 'pending-uuid', status: BookingStatus.PENDING }),
    );

    const result = await service.create(dto, REQUEST_ID);

    expect(result.bookingReference).toBe('pending-uuid');
    expect(bookingsRepo.save).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      { bookingId: 'pending-uuid' },
      { jobId: 'pending-uuid' },
    );
  });

  describe('findAll', () => {
    const query = (overrides: Partial<QueryBookingsDto>): QueryBookingsDto =>
      ({ page: 1, limit: 20, ...overrides }) as QueryBookingsDto;

    it('throws 404 when filtering by an event that does not exist', async () => {
      eventsRepo.findOne.mockResolvedValue(null);

      await expect(service.findAll(query({ eventId: 99999 }))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(bookingsRepo.findAndCount).not.toHaveBeenCalled();
    });

    it('returns a paginated envelope when the filtered event exists', async () => {
      eventsRepo.findOne.mockResolvedValue({ id: 3 } as Event);
      bookingsRepo.findAndCount.mockResolvedValue([[makeBooking({ id: 'b1' })], 1]);

      const result = await service.findAll(query({ eventId: 3 }));

      expect(result.total).toBe(1);
      expect(result.data[0].bookingReference).toBe('b1');
    });

    it('does not look up an event when no eventId filter is supplied', async () => {
      const result = await service.findAll(query({}));

      expect(result.total).toBe(0);
      expect(eventsRepo.findOne).not.toHaveBeenCalled();
    });
  });
});
