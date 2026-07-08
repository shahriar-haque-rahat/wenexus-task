import { IsEmail, IsInt, IsNotEmpty, IsPositive, IsString, MaxLength, Min } from 'class-validator';

/**
 * Body of `POST /bookings`.
 *
 * `requestId` is NOT sent by the client — it is generated server-side by the
 * controller using `crypto.randomUUID()`. Duplicate detection uses request
 * fingerprinting: matching (eventId + customerEmail + seats) within a 30-second
 * window. See README.md (Key design decisions).
 */
export class CreateBookingDto {
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
