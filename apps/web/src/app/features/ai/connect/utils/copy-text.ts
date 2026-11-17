/**
 * Copies `text` with the Clipboard API; `false` when the browser has none or refuses (the caller
 * then lets the person select and copy it themselves). Nothing is logged.
 */
export async function copyText(doc: Document, text: string): Promise<boolean> {
  const clipboard = doc.defaultView?.navigator.clipboard;
  if (!clipboard || text === '') return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
