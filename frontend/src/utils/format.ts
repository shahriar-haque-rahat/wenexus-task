/** Formats a UUID or long reference string into a shorter ID (e.g., first 8 characters). */
export function formatReferenceId(id: string): string {
  if (!id) return '';
  return id.slice(0, 8);
}

/** Formats an integer cent amount as a dollar string (e.g., 15000 → "$150.00"). */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
