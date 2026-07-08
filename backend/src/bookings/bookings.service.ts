import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { FindOptionsWhere, MoreThan, Repository } from 'typeorm';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
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
   * `requestId` is a server-generated UUID (one per incoming HTTP request).
   * Duplicate protection uses request fingerprinting: a exact match on
   * (eventId + customerEmail + seats) within a 30-second window is treated as
   * an accidental duplicate submit (double-click, retry, multiple tabs) and
   * returns the existing booking. Combined with the frontend's
   * `disabled={submitting}` button, this catches the two common duplicate
   * surfaces — user double-clicks and near-simultaneous browser-tab submits.
   */
  async create(dto: CreateBookingDto, requestId: string): Promise<BookingResponseDto> {
    // Duplicate detection via request fingerprint: same event + customer email
    // + number of seats within a 30-second window.
    const since = new Date(Date.now() - 30_000);
    const existing = await this.bookingsRepository.findOne({
      where: {
        eventId: dto.eventId,
        customerEmail: dto.customerEmail,
        seats: dto.seats,
        createdAt: MoreThan(since),
      },
      order: { createdAt: 'DESC' },
    });
    if (existing) {
      return this.returnExisting(existing);
    }

    const event = await this.eventsRepository.findOne({ where: { id: dto.eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${dto.eventId} not found`);
    }

    const booking = this.bookingsRepository.create({
      requestId,
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
      // If the UNIQUE constraint on request_id fires (extremely unlikely since
      // requestId is crypto.randomUUID), fall through to the error handler.
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
      // Reject a filter on an unknown event with a clear 404 rather than
      // silently returning an empty page (which the caller could not tell
      // apart from "this event simply has no bookings yet").
      const event = await this.eventsRepository.findOne({ where: { id: eventId } });
      if (!event) {
        throw new NotFoundException(`Event ${eventId} not found`);
      }
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

  async findOne(id: string): Promise<BookingResponseDto> {
    const booking = await this.bookingsRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    return BookingResponseDto.fromEntity(booking);
  }
}

