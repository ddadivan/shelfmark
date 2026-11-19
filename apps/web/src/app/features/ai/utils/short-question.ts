/**
 * The question as the "Search “…”" button quotes it: whole up to `max` characters, else cut at the
 * last word boundary within `max` (or at `max` for one long word) with an ellipsis. The search
 * itself still gets the whole question.
 */
export function shortQuestion(question: string, max: number): string {
  const text = question.trim().replace(/\s+/gu, ' ');
  const chars = [...text];
  if (chars.length <= max) return text;
  const head = chars.slice(0, max).join('');
  const space = head.lastIndexOf(' ');
  const cut = space > max / 2 ? head.slice(0, space) : head;
  return `${cut.replace(/[\s,.;:!?–—-]+$/u, '')}…`;
}
