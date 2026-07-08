import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

/**
 * A customer's request to book seats for an event.
 *
 * The `id` is a server-generated UUID and doubles as the public booking
 * reference returned by POST /bookings. `requestId` is a server-generated UUID
 * (one per incoming HTTP request, created by the controller). Duplicate
 * detection is handled via request fingerprinting (eventId + customerEmail +
 * seats within a 30-second window) rather than by the UNIQUE constraint on
 * request_id, since the server now generates a fresh UUID per request.
 */
@Entity({ name: 'bookings' })
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_bookings_request_id', { unique: true })
  @Column({ name: 'request_id', type: 'varchar', length: 200 })
  requestId: string;

  @Column({ name: 'event_id', type: 'int' })
  eventId: number;

  @ManyToOne(() => Event, (event) => event.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 320 })
  customerEmail: string;

  @Column({ type: 'int' })
  seats: number;

  @Index('IDX_bookings_status')
  @Column({ type: 'varchar', length: 20, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
