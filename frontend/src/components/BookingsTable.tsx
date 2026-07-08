import type { BookingDto, EventDto } from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  bookings: BookingDto[];
  events: EventDto[];
}

export function BookingsTable({ bookings, events }: Props) {
  const eventName = (id: number) => events.find((e) => e.id === id)?.name ?? `Event #${id}`;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Event</th>
            <th>Customer</th>
            <th className="num">Seats</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td className="mono" title={booking.id}>
                {booking.id.slice(0, 8)}
              </td>
              <td>{eventName(booking.eventId)}</td>
              <td>
                <div className="cust">
                  <span className="cust__name">{booking.customerName}</span>
                  <span className="cust__email">{booking.customerEmail}</span>
                </div>
              </td>
              <td className="num">{booking.seats}</td>
              <td>
                <StatusBadge status={booking.status} reason={booking.failureReason} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
