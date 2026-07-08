import type { BookingDto, CreateBookingInput, EventDto, PaginatedResponse } from './types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

/** Unwraps a fetch Response, turning API error payloads into thrown Errors. */
async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
    } catch {
      // response had no JSON body; keep the default message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function fetchEvents(): Promise<EventDto[]> {
  return fetch(`${BASE_URL}/events`).then((res) => unwrap<EventDto[]>(res));
}

export interface BookingsQuery {
  page?: number;
  limit?: number;
  eventId?: number;
  status?: string;
}

export function fetchBookings(query: BookingsQuery): Promise<PaginatedResponse<BookingDto>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.eventId) params.set('eventId', String(query.eventId));
  if (query.status) params.set('status', query.status);
  const qs = params.toString();
  return fetch(`${BASE_URL}/bookings${qs ? `?${qs}` : ''}`).then((res) =>
    unwrap<PaginatedResponse<BookingDto>>(res),
  );
}

export function createBooking(input: CreateBookingInput): Promise<BookingDto> {
  return fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((res) => unwrap<BookingDto>(res));
}
