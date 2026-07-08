import { Event } from '../../entities/event.entity';

/**
 * Public shape of an event returned by the API. Prices are exposed as integer
 * cents (`priceCents`); the client is responsible for formatting currency.
 */
export class EventResponseDto {
  id: number;
  name: string;
  date: string;
  priceCents: number;
  totalSeats: number;
  availableSeats: number;

  static fromEntity(event: Event): EventResponseDto {
    return {
      id: event.id,
      name: event.name,
      date: event.date.toISOString(),
      priceCents: event.priceCents,
      totalSeats: event.totalSeats,
      availableSeats: event.availableSeats,
    };
  }
}
