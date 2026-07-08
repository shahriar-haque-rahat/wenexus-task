/** PostgreSQL SQLSTATE for a unique-constraint violation. */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * True when the error is a PostgreSQL unique-constraint violation, regardless of
 * whether the code sits on the TypeORM `QueryFailedError` or its wrapped
 * `driverError`.
 */
export function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string })?.code ??
    (err as { driverError?: { code?: string } })?.driverError?.code;
  return code === PG_UNIQUE_VIOLATION;
}
