import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Event } from '../entities/event.entity';

export interface BookingOutcome {
  status: BookingStatus.CONFIRMED | BookingStatus.FAILED;
  reason?: string;
}

/**
 * Core booking-processing logic, extracted from the queue worker so it can be
 * driven directly (and concurrently) by tests.
 *
 * Overbooking safety: seat deduction uses an atomic conditional UPDATE
 *
 *     UPDATE events SET available_seats = available_seats - :n
 *      WHERE id = :id AND available_seats >= :n
 *
 * The row-level write lock Postgres takes for the duration of the UPDATE
 * serialises concurrent updates to the same event row, and the
 * `available_seats >= :n` guard makes overselling impossible — no explicit
 * SELECT ... FOR UPDATE needed. If the UPDATE matches no row, either the event
 * is gone or it is sold out.
 *
 * The seat deduction and the booking status change run in ONE transaction, so a
 * crash or transient failure can never leave seats deducted without a confirmed
 * booking (or vice versa); on retry the booking is still PENDING and is
 * reprocessed cleanly.
 *
 * Exactly-once per booking: the booking row is locked `FOR UPDATE` and its status
 * re-checked inside the transaction. BullMQ is at-least-once (a stalled job can be
 * re-delivered while another worker slot is still processing it), so without this
 * lock two concurrent runs of the SAME booking could each pass the PENDING check
 * and deduct seats twice. The lock serialises them: the second run blocks, then
 * sees a non-PENDING booking and is a no-op.
 *
 * Returns the resulting outcome, or `null` when there was nothing to do (the
 * booking was already processed or no longer exists).
 */
@Injectable()
export class BookingProcessingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async processBooking(bookingId: string): Promise<BookingOutcome | null> {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking || booking.status !== BookingStatus.PENDING) {
        return null;
      }

      // TypeORM's postgres driver returns a `[rows, affectedCount]` tuple for a
      // RETURNING update; `affected === 1` means the conditional decrement won.
      const [, affected] = (await manager.query(
        `UPDATE events
            SET available_seats = available_seats - $1, updated_at = now()
          WHERE id = $2 AND available_seats >= $1
          RETURNING id`,
        [booking.seats, booking.eventId],
      )) as [unknown[], number];

      if (affected > 0) {
        booking.status = BookingStatus.CONFIRMED;
        booking.failureReason = null;
        await manager.save(booking);
        return { status: BookingStatus.CONFIRMED };
      }

      // No row updated: the event is missing or does not have enough seats.
      const eventCount = await manager.count(Event, { where: { id: booking.eventId } });
      const reason = eventCount > 0 ? 'Not enough seats available' : 'Event no longer exists';
      booking.status = BookingStatus.FAILED;
      booking.failureReason = reason;
      await manager.save(booking);
      return { status: BookingStatus.FAILED, reason };
    });
  }

  /**
   * Marks a still-PENDING booking FAILED. Used when the queue has exhausted its
   * retries for a booking, so a transient outage can never leave it stuck in
   * PENDING forever. No-op if the booking already reached a terminal state.
   */
  async failIfPending(bookingId: string, reason: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking || booking.status !== BookingStatus.PENDING) {
        return false;
      }
      booking.status = BookingStatus.FAILED;
      booking.failureReason = reason;
      await manager.save(booking);
      return true;
    });
  }
}
