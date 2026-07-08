import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';

/**
 * An event that customers can book seats for.
 *
 * `availableSeats` is the source of truth for remaining capacity and is
 * decremented atomically when a booking is confirmed (see BookingsProcessor).
 * Prices are stored in integer cents to avoid floating-point rounding issues.
 */
@Entity({ name: 'events' })
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ name: 'total_seats', type: 'int' })
  totalSeats: number;

  @Column({ name: 'available_seats', type: 'int' })
  availableSeats: number;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Booking, (booking) => booking.event)
  bookings: Booking[];
}
