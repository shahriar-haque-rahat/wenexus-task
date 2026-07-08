import { NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Event } from '../entities/event.entity';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

type MockRepo<T> = Pick<Repository<T>, 'findOne'> & {
  create: jest.Mock;
  save: jest.Mock;
};

const dto: CreateBookingDto = {
  requestId: 'req-1',
  eventId: 1,
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  seats: 2,
};

function makeBooking(overrides: Partial<Booking>): Booking {
  return {
    id: 'booking-uuid',
    requestId: dto.requestId,
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
    };
    eventsRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
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

    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(bookingsRepo.save).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('creates a PENDING booking and enqueues it for a new requestId', async () => {
    bookingsRepo.findOne.mockResolvedValue(null);
    eventsRepo.findOne.mockResolvedValue({ id: 1 } as Event);
    bookingsRepo.save.mockResolvedValue(makeBooking({ id: 'new-uuid' }));

    const result = await service.create(dto);

    expect(result.id).toBe('new-uuid');
    expect(result.status).toBe(BookingStatus.PENDING);
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      { bookingId: 'new-uuid' },
      { jobId: 'new-uuid' },
    );
  });

  it('returns the existing booking without inserting or enqueuing for a duplicate requestId', async () => {
    bookingsRepo.findOne.mockResolvedValue(
      makeBooking({ id: 'existing-uuid', status: BookingStatus.CONFIRMED }),
    );

    const result = await service.create(dto);

    expect(result.id).toBe('existing-uuid');
    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(bookingsRepo.save).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('re-enqueues an existing PENDING booking to recover a possibly-lost job', async () => {
    bookingsRepo.findOne.mockResolvedValue(
      makeBooking({ id: 'pending-uuid', status: BookingStatus.PENDING }),
    );

    const result = await service.create(dto);

    expect(result.id).toBe('pending-uuid');
    expect(bookingsRepo.save).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      { bookingId: 'pending-uuid' },
      { jobId: 'pending-uuid' },
    );
  });
});
