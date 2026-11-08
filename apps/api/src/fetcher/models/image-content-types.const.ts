/**
 * Response types accepted in image mode. Servers label icons loosely (`application/octet-stream`,
 * `image/x-icon`, `image/vnd.microsoft.icon`), so the header only has to look like an image or
 * binary; the real type is decided from the magic bytes afterwards. `text/html` (a soft-404 page)
 * and `image/svg+xml` (script in our origin) never pass.
 */
export const IMAGE_CONTENT_TYPE_PREFIX = 'image/';
export const IMAGE_BINARY_CONTENT_TYPES: readonly string[] = [
  'application/octet-stream',
  'binary/octet-stream',
  'application/x-icon',
];
export const REJECTED_IMAGE_CONTENT_TYPES: readonly string[] = ['image/svg+xml'];
