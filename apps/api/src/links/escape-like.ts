const LIKE_SPECIAL = /[\\%_]/g;

/**
 * Escapes the `LIKE` / `ILIKE` wildcards (`%`, `_`) and the escape character (`\`, PostgreSQL's
 * default) so a search word only ever matches itself. Prisma's `contains` wraps the value in `%`
 * but does not escape it.
 */
export function escapeLike(value: string): string {
  return value.replace(LIKE_SPECIAL, (character) => `\\${character}`);
}
