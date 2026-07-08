import { Booking, BookingStatus } from '../../entities/booking.entity';

/**
 * Public shape of a booking. `id` is the booking reference returned to clients.
 */
export class BookingResponseDto {
  id: string;
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
      id: booking.id,
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
