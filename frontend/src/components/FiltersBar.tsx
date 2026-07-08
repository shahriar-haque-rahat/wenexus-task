import type { BookingStatus, EventDto } from '../types';
import { Select } from './ui/Select';

interface Props {
  events: EventDto[];
  eventId: number | '';
  status: string;
  onChange: (next: { eventId?: number | ''; status?: string }) => void;
}

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'FAILED'];

export function FiltersBar({ events, eventId, status, onChange }: Props) {
  const eventOptions = [
    { value: '' as const, label: 'All events' },
    ...events.map((ev) => ({
      value: ev.id,
      label: ev.name,
    })),
  ];

  const statusOptions = [
    { value: '', label: 'All statuses' },
    ...STATUSES.map((s) => ({
      value: s,
      label: s,
    })),
  ];

  return (
    <div className="filters">
      <Select
        id="filter-event-select"
        label="Event"
        className="field--inline"
        value={eventId}
        options={eventOptions}
        onChange={(val) => onChange({ eventId: val })}
      />
      <Select
        id="filter-status-select"
        label="Status"
        className="field--inline"
        value={status}
        options={statusOptions}
        onChange={(val) => onChange({ status: val as string })}
      />
    </div>
  );
}

