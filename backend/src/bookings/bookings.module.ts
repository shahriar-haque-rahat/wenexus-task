import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../entities/booking.entity';
import { Event } from '../entities/event.entity';
import { BookingProcessingService } from './booking-processing.service';
import { BOOKINGS_QUEUE } from './bookings.constants';
import { BookingsController } from './bookings.controller';
import { BookingsProcessor } from './bookings.processor';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Event]),
    BullModule.registerQueue({
      name: BOOKINGS_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingProcessingService, BookingsProcessor],
})
export class BookingsModule {}
