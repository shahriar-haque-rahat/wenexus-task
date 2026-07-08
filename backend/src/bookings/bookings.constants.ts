/** Name of the BullMQ queue that processes bookings asynchronously. */
export const BOOKINGS_QUEUE = 'bookings';

/** Job name for a single booking to be processed. */
export const PROCESS_BOOKING_JOB = 'process-booking';

/** Payload of a booking-processing job. */
export interface ProcessBookingJobData {
  bookingId: string;
}
