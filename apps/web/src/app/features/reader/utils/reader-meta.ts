/** "Angular team · 2 Oct 2026 · 5 min read": the parts that exist, joined by a middle dot. */
export function readerMeta(parts: readonly (string | null | undefined)[]): string {
  return parts.filter((part): part is string => !!part && part.trim() !== '').join(' · ');
}
