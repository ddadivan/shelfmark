/**
 * Hands a downloaded file to the browser's save flow through a temporary `<a download>`. The
 * blob is only saved, never rendered or navigated to, so an HTML export cannot run in the app.
 */
export function saveBlob(doc: Document, blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  doc.body.append(anchor);
  anchor.click();
  anchor.remove();
  // The download has started synchronously; the URL is not needed afterwards.
  setTimeout(() => URL.revokeObjectURL(url));
}

const FILE_NAME = /filename="?([^";]+)"?/i;
const DOTS_ONLY = /^\.+$/;

const DEL = 0x7f;
const SPACE = 0x20;

function withoutControlChars(text: string): string {
  return Array.from(text)
    .filter((char) => {
      const code = char.codePointAt(0) ?? SPACE;
      return code >= SPACE && code !== DEL;
    })
    .join('');
}

/**
 * The file name of a `Content-Disposition` header, or the fallback. Path separators become `_`,
 * control characters are dropped, and a name of only dots (`.`, `..`) is not a file name.
 */
export function fileNameOf(disposition: string | null, fallback: string): string {
  const raw = disposition ? FILE_NAME.exec(disposition)?.[1] : undefined;
  const name = raw && withoutControlChars(raw).replace(/[\\/]/g, '_').trim();
  return name && !DOTS_ONLY.test(name) ? name : fallback;
}
