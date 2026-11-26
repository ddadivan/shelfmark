/** True when the absolute URL carries a username or password (`https://user:pw@host/`). */
export function hasCredentials(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.username !== '' || parsed.password !== '';
  } catch {
    return false;
  }
}
