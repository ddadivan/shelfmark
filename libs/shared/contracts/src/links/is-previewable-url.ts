/**
 * True for an absolute `https:` URL with a host and no credentials: the only addresses the link
 * preview frames (#553). A plain `http:` page cannot load inside the https app (mixed content),
 * and `javascript:`, `data:` and the like never reach a frame.
 */
export function isPreviewableUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' && url.hostname !== '' && url.username === '' && url.password === ''
    );
  } catch {
    return false;
  }
}
