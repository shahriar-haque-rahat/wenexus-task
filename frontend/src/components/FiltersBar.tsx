import type { BookingStatus, EventDto } from '../types';

interface Props {
  events: EventDto[];
  eventId: number | '';
  status: string;
  onChange: (next: { eventId?: number | ''; status?: string }) => void;
}

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'FAILED'];

export function FiltersBar({ events, eventId, status, onChange }: Props) {
  return (
    <div className="filters">
      <label className="field field--inline">
        <span>Event</span>
        <select
          value={eventId}
          onChange={(e) => onChange({ eventId: e.target.value === '' ? '' : Number(e.target.value) })}
        >
          <option value="">All events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field field--inline">
        <span>Status</span>
        <select value={status} onChange={(e) => onChange({ status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
