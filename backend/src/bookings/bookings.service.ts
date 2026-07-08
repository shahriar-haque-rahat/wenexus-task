import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { isUniqueViolation } from '../common/pg-error.util';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Event } from '../entities/event.entity';
import {
  BOOKINGS_QUEUE,
  PROCESS_BOOKING_JOB,
  ProcessBookingJobData,
} from './bookings.constants';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectQueue(BOOKINGS_QUEUE)
    private readonly bookingsQueue: Queue<ProcessBookingJobData>,
  ) {}

  /**
   * Creates a booking in PENDING state and enqueues it for asynchronous
   * processing. Availability is NOT checked here — the endpoint returns
   * immediately (202) and the queue worker performs the actual seat deduction.
   * Unknown events are rejected up front with a 404 so we never insert a
   * booking that violates the event foreign key.
   *
   * Idempotency: a repeated `requestId` never creates a second booking. The
   * fast path returns any existing booking directly; the `request_id` UNIQUE
   * constraint plus catching the unique violation closes the race between two
   * concurrent identical requests (the loser returns the winner's booking).
   */
  async create(dto: CreateBookingDto): Promise<BookingResponseDto> {
    const existing = await this.bookingsRepository.findOne({
      where: { requestId: dto.requestId },
    });
    if (existing) {
      return this.returnExisting(existing);
    }

    const event = await this.eventsRepository.findOne({ where: { id: dto.eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${dto.eventId} not found`);
    }

    const booking = this.bookingsRepository.create({
      requestId: dto.requestId,
      eventId: dto.eventId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      seats: dto.seats,
      status: BookingStatus.PENDING,
    });

    let saved: Booking;
    try {
      saved = await this.bookingsRepository.save(booking);
    } catch (err) {
      if (isUniqueViolation(err)) {
        const winner = await this.bookingsRepository.findOne({
          where: { requestId: dto.requestId },
        });
        if (winner) {
          return this.returnExisting(winner);
        }
      }
      throw err;
    }

    await this.enqueue(saved.id);

    return BookingResponseDto.fromEntity(saved);
  }

  /**
   * Returns an already-existing booking for a duplicate request. If it is still
   * PENDING, it is re-enqueued: this recovers a booking that was persisted but
   * whose job was never created (e.g. a crash or Redis blip between insert and
   * enqueue). `enqueue` is idempotent (`jobId` = booking id), so an in-flight
   * job is not duplicated.
   */
  private async returnExisting(booking: Booking): Promise<BookingResponseDto> {
    if (booking.status === BookingStatus.PENDING) {
      await this.enqueue(booking.id);
    }
    return BookingResponseDto.fromEntity(booking);
  }

  /** Enqueues a booking for the worker. `jobId` keeps a booking enqueued once. */
  private async enqueue(bookingId: string): Promise<void> {
    await this.bookingsQueue.add(
      PROCESS_BOOKING_JOB,
      { bookingId },
      { jobId: bookingId },
    );
  }

  /** Paginated list of bookings, newest first, filterable by event and status. */
  async findAll(query: QueryBookingsDto): Promise<PaginatedResponse<BookingResponseDto>> {
    const { page, limit, eventId, status } = query;

    const where: FindOptionsWhere<Booking> = {};
    if (eventId !== undefined) {
      where.eventId = eventId;
    }
    if (status !== undefined) {
      where.status = status;
    }

    const [rows, total] = await this.bookingsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: rows.map((booking) => BookingResponseDto.fromEntity(booking)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
