/** Narrows `unknown` to an object whose properties can be read safely (arrays included). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
