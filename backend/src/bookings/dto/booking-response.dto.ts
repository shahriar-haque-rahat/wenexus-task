import { Booking, BookingStatus } from '../../entities/booking.entity';

/**
 * Public shape of a booking. `bookingReference` (the entity's `id` PK) is the
 * backend-generated booking reference returned to clients. `requestId` is a
 * server-generated UUID (one per HTTP request), not a client-generated value.
 */
export class BookingResponseDto {
  bookingReference: string;
  requestId: string;
  eventId: number;
  customerName: string;
  customerEmail: string;
  seats: number;
  status: BookingStatus;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;

  static fromEntity(booking: Booking): BookingResponseDto {
    return {
      bookingReference: booking.id,
      requestId: booking.requestId,
      eventId: booking.eventId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      seats: booking.seats,
      status: booking.status,
      failureReason: booking.failureReason ?? null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }
}
