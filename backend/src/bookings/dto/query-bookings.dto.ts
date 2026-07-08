import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { BookingStatus } from '../../entities/booking.entity';

/** Empty/absent → fallback; otherwise coerce to Number (invalids left for validators). */
const numberOr = (value: unknown, fallback: number | undefined): number | undefined => {
  if (value === '' || value === null || value === undefined) return fallback;
  return Number(value);
};

/**
 * Query parameters for `GET /bookings`: pagination plus optional filters by
 * event and status. Values arrive as strings; empty params (e.g. `?status=`)
 * are treated as "no filter" rather than rejected, and pagination falls back to
 * sensible defaults.
 */
export class QueryBookingsDto {
  @IsOptional()
  @Transform(({ value }) => numberOr(value, 1))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => numberOr(value, 20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Transform(({ value }) => numberOr(value, undefined))
  @IsInt()
  @IsPositive()
  eventId?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
