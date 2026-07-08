import { useState, type FormEvent } from 'react';
import { createBooking } from '../api';
import type { BookingDto, EventDto } from '../types';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { formatReferenceId } from '../utils/format';

interface Props {
  events: EventDto[];
  onCreated: (booking: BookingDto) => void;
}

type FormMessage = { type: 'ok' | 'err'; text: string };
type FieldErrors = { event?: string; name?: string; email?: string; seats?: string };

// Mirrors the backend's @IsEmail intent well enough to catch bad input before
// the request is sent (native type=email is too permissive — it accepts "a@b").
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BookingForm({ events, onCreated }: Props) {
  const [eventId, setEventId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [seats, setSeats] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (eventId === '') next.event = 'Please select an event.';
    if (!customerName.trim()) next.name = 'Name is required.';
    if (!EMAIL_RE.test(customerEmail.trim())) next.email = 'Enter a valid email address.';
    if (!Number.isInteger(seats) || seats < 1) {
      next.seats = 'Seats must be a whole number of at least 1.';
    }
    return next;
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerEmail('');
    setSeats(1);
    setErrors({});
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setMessage(null);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const booking = await createBooking({
        eventId: eventId as number,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        seats,
      });
      setMessage({
        type: 'ok',
        text: `Booking accepted — reference ${formatReferenceId(booking.bookingReference)}, status ${booking.status}.`,
      });
      resetForm();
      onCreated(booking);
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to create booking',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const eventOptions = [
    { value: '' as const, label: 'Select an event…' },
    ...events.map((ev) => ({
      value: ev.id,
      label: `${ev.name} — ${ev.availableSeats}/${ev.totalSeats} seats left`,
      disabled: ev.availableSeats <= 0,
    })),
  ];

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>New booking</h2>
      </div>
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="form__row">
          <Select
            id="booking-event-select"
            label="Event"
            value={eventId}
            options={eventOptions}
            onChange={(val) => setEventId(val === '' ? '' : Number(val))}
            required
            error={errors.event}
            className="field field--grow"
          />
          <Input
            id="booking-seats-input"
            label="Seats"
            type="number"
            min={1}
            step={1}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            required
            error={errors.seats}
            className="field field--seats"
          />
        </div>
        <div className="form__row">
          <Input
            id="booking-customer-name-input"
            label="Name"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            error={errors.name}
            placeholder="Jane Doe"
            className="field field--grow"
          />
          <Input
            id="booking-customer-email-input"
            label="Email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            required
            error={errors.email}
            placeholder="jane@example.com"
            className="field field--grow"
          />
        </div>
        <div className="form__actions">
          <Button type="submit" disabled={submitting} loading={submitting}>
            Book seats
          </Button>
          {message && <span className={`form__msg form__msg--${message.type}`}>{message.text}</span>}
        </div>
      </form>
    </section>
  );
}
