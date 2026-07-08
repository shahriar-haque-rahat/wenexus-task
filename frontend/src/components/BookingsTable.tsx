import type { BookingDto, EventDto } from '../types';
import { StatusBadge } from './StatusBadge';
import { Table, type Column } from './ui/Table';
import { formatReferenceId } from '../utils/format';

interface Props {
  bookings: BookingDto[];
  events: EventDto[];
}

export function BookingsTable({ bookings, events }: Props) {
  const eventName = (id: number) => events.find((e) => e.id === id)?.name ?? `Event #${id}`;

  const columns: Column<BookingDto>[] = [
    {
      header: 'Reference',
      render: (booking) => (
        <span className="mono" title={booking.id}>
          {formatReferenceId(booking.id)}
        </span>
      ),
    },
    {
      header: 'Event',
      render: (booking) => eventName(booking.eventId),
    },
    {
      header: 'Customer',
      render: (booking) => (
        <div className="cust">
          <span className="cust__name">{booking.customerName}</span>
          <span className="cust__email">{booking.customerEmail}</span>
        </div>
      ),
    },
    {
      header: 'Seats',
      className: 'num',
      headerClassName: 'num',
      render: (booking) => booking.seats,
    },
    {
      header: 'Status',
      render: (booking) => (
        <StatusBadge status={booking.status} reason={booking.failureReason} />
      ),
    },
  ];

  return (
    <Table
      data={bookings}
      columns={columns}
      keyExtractor={(booking) => booking.id}
      emptyMessage="No bookings match these filters yet."
    />
  );
}

