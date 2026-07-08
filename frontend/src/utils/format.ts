/** Formats a UUID or long reference string into a shorter ID (e.g., first 8 characters). */
export function formatReferenceId(id: string): string {
  if (!id) return '';
  return id.slice(0, 8);
}
