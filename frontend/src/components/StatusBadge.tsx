import type { BookingStatus } from '../types';

interface Props {
  status: BookingStatus;
  reason?: string | null;
}

export function StatusBadge({ status, reason }: Props) {
  return (
    <span className={`badge badge--${status.toLowerCase()}`} title={reason ?? undefined}>
      <span className="badge__dot" aria-hidden="true" />
      {status}
    </span>
  );
}
