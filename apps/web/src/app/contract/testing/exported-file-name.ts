import { vi } from 'vitest';

/**
 * The name the browser would save a download under: runs `download` and reads the `download`
 * attribute of the temporary anchor `saveBlob` clicks. No file is written.
 */
export async function exportedFileName(download: () => Promise<unknown>): Promise<string> {
  const names: string[] = [];
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    names.push(this.download);
  });
  const createUrl = URL.createObjectURL;
  const revokeUrl = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:contract';
  URL.revokeObjectURL = () => undefined;
  try {
    await download();
  } finally {
    click.mockRestore();
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = revokeUrl;
  }
  return names[0] ?? '';
}
