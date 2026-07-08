import { useCallback, useEffect, useState } from 'react';
import { fetchBookings, fetchEvents } from './api';
import { BookingForm } from './components/BookingForm';
import { BookingsTable } from './components/BookingsTable';
import { FiltersBar } from './components/FiltersBar';
import { Pagination } from './components/Pagination';
import type { BookingDto, EventDto, PaginatedResponse } from './types';

const PAGE_LIMIT = 10;
const POLL_INTERVAL_MS = 3000;

export default function App() {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [page, setPage] = useState(1);
  const [eventId, setEventId] = useState<number | ''>('');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<PaginatedResponse<BookingDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Poll so PENDING bookings visibly settle to CONFIRMED/FAILED, and seat
  // counts stay current, without the user refreshing.
  useEffect(() => {
    const id = setInterval(() => {
      void loadBookings({ silent: true });
      void loadEvents();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadBookings, loadEvents]);

  const onFilterChange = (next: { eventId?: number | ''; status?: string }) => {
    if (next.eventId !== undefined) setEventId(next.eventId);
    if (next.status !== undefined) setStatus(next.status);
    setPage(1);
  };

  const refreshAll = () => {
    void loadBookings();
    void loadEvents();
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>Event Booking Dashboard</h1>
        <p className="app__subtitle">Book seats and watch bookings settle in real time.</p>
      </header>

      <BookingForm events={events} onCreated={refreshAll} />

      <section className="panel">
        <div className="panel__head">
          <h2>Bookings</h2>
          <button className="btn btn--ghost" onClick={refreshAll}>
            Refresh
          </button>
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
