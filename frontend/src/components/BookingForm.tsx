import { useState, type FormEvent } from 'react';
import { createBooking } from '../api';
import type { EventDto } from '../types';

interface Props {
  events: EventDto[];
  onCreated: () => void;
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
        text: `Booking accepted — reference ${booking.id.slice(0, 8)}, status ${booking.status}.`,
      });
      resetCustomer();
      onCreated();
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Failed to create booking' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>New booking</h2>
      </div>
      <form className="form" onSubmit={onSubmit}>
        <div className="form__row">
          <label className="field field--grow">
            <span>Event</span>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value === '' ? '' : Number(e.target.value))}
              required
            >
              <option value="">Select an event…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} disabled={ev.availableSeats <= 0}>
                  {ev.name} — {ev.availableSeats}/{ev.totalSeats} seats left
                </option>
              ))}
            </select>
          </label>
          <label className="field field--seats">
            <span>Seats</span>
            <input
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
              required
            />
          </label>
        </div>
        <div className="form__row">
          <label className="field field--grow">
            <span>Name</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="Jane Doe"
            />
          </label>
          <label className="field field--grow">
            <span>Email</span>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              placeholder="jane@example.com"
            />
          </label>
        </div>
        <div className="form__actions">
          <button className="btn btn--primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Book seats'}
          </button>
          {message && <span className={`form__msg form__msg--${message.type}`}>{message.text}</span>}
        </div>
      </form>
    </section>
  );
}
