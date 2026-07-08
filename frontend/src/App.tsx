import { useCallback, useEffect, useState } from 'react';
import { fetchBookings, fetchEvents, fetchBookingById } from './api';
import { BookingForm } from './components/BookingForm';
import { BookingsTable } from './components/BookingsTable';
import { FiltersBar } from './components/FiltersBar';
import { Pagination } from './components/Pagination';
import { Button } from './components/ui/Button';
import type { BookingDto, EventDto, PaginatedResponse } from './types';

const PAGE_LIMIT = 10;

export default function App() {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [page, setPage] = useState(1);
  const [eventId, setEventId] = useState<number | ''>('');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<PaginatedResponse<BookingDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingBookingId, setPollingBookingId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setEvents(await fetchEvents());
    } catch {
      // Non-fatal for the dashboard; the bookings error area surfaces API issues.
    }
  }, []);

  const loadBookings = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetchBookings({
          page,
          limit: PAGE_LIMIT,
          eventId: eventId === '' ? undefined : eventId,
          status: status || undefined,
        });
        setResult(res);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bookings');
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [page, eventId, status],
  );

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  // Scoped polling: after a booking is submitted, poll ONLY that specific booking's status
  // every 1.5s, and STOP polling as soon as it leaves PENDING. A transient fetch error is
  // NOT a terminal state, so it does not stop the poll; a bounded attempt cap guarantees the
  // poll can never run forever if the booking never settles server-side.
  const POLL_INTERVAL_MS = 1500;
  const MAX_POLL_ATTEMPTS = 40; // ~60s, then give up and let the user refresh manually
  useEffect(() => {
    if (!pollingBookingId) return;

    let isActive = true;
    let attempts = 0;
    const runPoll = async () => {
      attempts += 1;
      try {
        const booking = await fetchBookingById(pollingBookingId);
        if (!isActive) return;

        if (booking) {
          // Update the single booking in our current paginated result list immediately
          setResult((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              data: prev.data.map((b) => (b.bookingReference === booking.bookingReference ? booking : b)),
            };
          });

          // Stop polling when it leaves PENDING
          if (booking.status !== 'PENDING') {
            setPollingBookingId(null);
            // Refresh dashboard (silent) to ensure general counts and sibling pages match
            void loadBookings({ silent: true });
            void loadEvents();
            return;
          }
        }
      } catch {
        // Transient error (network blip / momentary 5xx) — keep polling; do not terminate.
      }
      if (attempts >= MAX_POLL_ATTEMPTS && isActive) {
        setPollingBookingId(null);
      }
    };

    const timerId = setInterval(() => {
      void runPoll();
    }, POLL_INTERVAL_MS);

    // Initial check right away
    void runPoll();

    return () => {
      isActive = false;
      clearInterval(timerId);
    };
  }, [pollingBookingId, loadBookings, loadEvents]);

  const onFilterChange = (next: { eventId?: number | ''; status?: string }) => {
    if (next.eventId !== undefined) setEventId(next.eventId);
    if (next.status !== undefined) setStatus(next.status);
    setPage(1);
  };

  const refreshAll = () => {
    void loadBookings();
    void loadEvents();
  };

  const handleBookingCreated = (booking: BookingDto) => {
    // A new booking is always PENDING and the newest row (list is createdAt DESC), so it
    // belongs on page 1 with no filters. Reset the view and optimistically insert it so the
    // user can immediately see it — and watch the scoped poll settle it — even if they were
    // on another page or had a filter that would otherwise hide a PENDING booking.
    setEventId('');
    setStatus('');
    setPage(1);
    setResult((prev) =>
      prev
        ? {
            ...prev,
            data: [booking, ...prev.data.filter((b) => b.bookingReference !== booking.bookingReference)].slice(0, PAGE_LIMIT),
            total: prev.data.some((b) => b.bookingReference === booking.bookingReference) ? prev.total : prev.total + 1,
          }
        : prev,
    );
    setPollingBookingId(booking.bookingReference);
    void loadEvents();
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>Event Booking Dashboard</h1>
        <p className="app__subtitle">Book seats and watch bookings settle in real time.</p>
      </header>

      <BookingForm events={events} onCreated={handleBookingCreated} />

      <section className="panel">
        <div className="panel__head">
          <h2>Bookings</h2>
          <Button variant="ghost" onClick={refreshAll}>
            Refresh
          </Button>
        </div>

        <FiltersBar events={events} eventId={eventId} status={status} onChange={onFilterChange} />

        {error && <div className="alert alert--error">{error}</div>}

        {loading && !result ? (
          <div className="empty">Loading bookings…</div>
        ) : result && result.data.length > 0 ? (
          <>
            <BookingsTable bookings={result.data} events={events} />
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              onPage={setPage}
            />
          </>
        ) : (
          <div className="empty">No bookings match these filters yet.</div>
        )}
      </section>
    </div>
  );
}

