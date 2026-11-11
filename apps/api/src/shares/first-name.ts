const MAX_LENGTH = 50;

/**
 * The first word of a display name, at most 50 characters: the only part of the owner a public
 * page shows ("Shared by Dmytro"). An empty name, or one that looks like an email address, gives
 * an empty string; the page then words it without one.
 */
export function firstName(name: string): string {
  const [first = ''] = name.trim().split(/\s+/u);
  // A display name that is an email address (some providers use it) is never published.
  if (first.includes('@')) {
    return '';
  }
  return [...first].slice(0, MAX_LENGTH).join('');
}
