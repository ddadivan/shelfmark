const LIKE_SPECIAL = /[\\%_]/g;

/**
 * Escapes the `LIKE` / `ILIKE` wildcards (`%`, `_`) and the escape character (`\`, PostgreSQL's
 * default) so a value only ever matches itself. Prisma does not escape them: `contains` wraps the
 * value in `%`, and `equals` with `mode: 'insensitive'` is emitted as `ILIKE`, so both need it.
 */
export function escapeLike(value: string): string {
  return value.replace(LIKE_SPECIAL, (character) => `\\${character}`);
}
