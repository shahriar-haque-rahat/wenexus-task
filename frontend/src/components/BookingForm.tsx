import { useState, type FormEvent } from 'react';
import { createBooking } from '../api';
import type { EventDto } from '../types';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { formatReferenceId } from '../utils/format';

interface Props {
  events: EventDto[];
  onCreated: (bookingId: string) => void;
}

type FormMessage = { type: 'ok' | 'err'; text: string };

export function BookingForm({ events, onCreated }: Props) {
  const [eventId, setEventId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [seats, setSeats] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);

  const resetCustomer = () => {
    setCustomerName('');
    setCustomerEmail('');
    setSeats(1);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (eventId === '') {
      setMessage({ type: 'err', text: 'Please select an event.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const booking = await createBooking({
        requestId: crypto.randomUUID(),
        eventId,
        customerName,
        customerEmail,
        seats,
      });
      setMessage({
        type: 'ok',
        text: `Booking accepted — reference ${formatReferenceId(booking.id)}, status ${booking.status}.`,
      });
      resetCustomer();
      onCreated(booking.id);
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Failed to create booking' });
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
      <form className="form" onSubmit={onSubmit}>
        <div className="form__row">
          <Select
            label="Event"
            value={eventId}
            options={eventOptions}
            onChange={(val) => setEventId(val === '' ? '' : Number(val))}
            required
            className="field field--grow"
          />
          <Input
            id="booking-seats-input"
            label="Seats"
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
            required
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

