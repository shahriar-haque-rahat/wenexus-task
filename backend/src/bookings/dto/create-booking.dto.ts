import { IsEmail, IsInt, IsNotEmpty, IsPositive, IsString, MaxLength, Min } from 'class-validator';

/**
 * Body of `POST /bookings`.
 *
 * `requestId` is a client-generated idempotency key. It is validated as a
 * non-empty string (not a strict UUID): the assignment's own sample payload
 * uses a non-UUID value, and the spec only requires "a client-generated
 * requestId". See docs/PROGRESS.md (Decisions Log).
 */
export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  requestId: string;

  @IsInt()
  @IsPositive()
  eventId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName: string;

  @IsEmail()
  @MaxLength(320)
  customerEmail: string;

  @IsInt()
  @Min(1)
  seats: number;
}
