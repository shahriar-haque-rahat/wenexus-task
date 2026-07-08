import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BookingProcessingService } from './booking-processing.service';
import { BOOKINGS_QUEUE, ProcessBookingJobData } from './bookings.constants';

/**
 * Thin BullMQ adapter: delegates each job to BookingProcessingService, which
 * holds the (concurrency-safe) business logic. `concurrency: 10` lets multiple
 * bookings be processed at once — the seat deduction must stay correct under
 * that parallelism.
 *
 * Retry policy (queue `defaultJobOptions`): business outcomes (event missing,
 * sold out) resolve normally, so the job completes and is NOT retried. Anything
 * unexpected (e.g. a transient DB error) propagates, so BullMQ retries with
 * exponential backoff. Once retries are exhausted, `onFailed` marks the booking
 * FAILED so it can never stay stuck in PENDING.
 */
@Processor(BOOKINGS_QUEUE, { concurrency: 10 })
export class BookingsProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingsProcessor.name);

  constructor(private readonly bookingProcessing: BookingProcessingService) {
    super();
  }

  async process(job: Job<ProcessBookingJobData>): Promise<void> {
    const outcome = await this.bookingProcessing.processBooking(job.data.bookingId);
    if (outcome) {
      this.logger.log(
        `Booking ${job.data.bookingId} ${outcome.status}${outcome.reason ? `: ${outcome.reason}` : ''}`,
      );
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ProcessBookingJobData>, err: Error): Promise<void> {
    const maxAttempts = job.opts?.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(
        `Booking ${job.data.bookingId} attempt ${job.attemptsMade}/${maxAttempts} failed, will retry: ${err.message}`,
      );
      return;
    }

    // Retries exhausted — don't leave the booking stuck in PENDING.
    const marked = await this.bookingProcessing.failIfPending(
      job.data.bookingId,
      'Processing failed after repeated errors',
    );
    this.logger.error(
      `Booking ${job.data.bookingId} permanently failed after ${job.attemptsMade} attempts` +
        `${marked ? ' (marked FAILED)' : ''}: ${err.message}`,
    );
  }
}
