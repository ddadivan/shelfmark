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

/** The file name of a `Content-Disposition` header without path separators, or the fallback. */
export function fileNameOf(disposition: string | null, fallback: string): string {
  const name = disposition ? FILE_NAME.exec(disposition)?.[1]?.replace(/[\\/]/g, '_').trim() : '';
  return name || fallback;
}
