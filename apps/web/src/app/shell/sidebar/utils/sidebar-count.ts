/** A node's `count` field, or nothing when there is no count to show. */
export function sidebarCount(value: number | undefined): { count: number } | Record<string, never> {
  return value === undefined ? {} : { count: value };
}
