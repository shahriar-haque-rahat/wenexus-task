export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface EventDto {
  id: number;
  name: string;
  date: string;
  priceCents: number;
  totalSeats: number;
  availableSeats: number;
}

export interface BookingDto {
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
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateBookingInput {
  requestId: string;
  eventId: number;
  customerName: string;
  customerEmail: string;
  seats: number;
}
