import type { BookingStatus } from '../types';
import { Badge } from './ui/Badge';

interface Props {
  status: BookingStatus;
  reason?: string | null;
}

export function StatusBadge({ status, reason }: Props) {
  const variant = status.toLowerCase() as 'pending' | 'confirmed' | 'failed';
  return (
    <Badge variant={variant} title={reason ?? undefined}>
      {status}
    </Badge>
  );
}

