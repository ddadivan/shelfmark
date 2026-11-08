import type { Response } from 'express';
import type { StoredLinkImage } from './models/stored-link-image.interface';

/**
 * Cache-Control of a stored image: browser only (`private`), a year, because the URL carries a
 * hash of the content (`?v=`) and changes with the image.
 */
const IMAGE_CACHE_CONTROL = 'private, max-age=31536000, immutable';

/**
 * Writes a stored image with the headers of ADR 0027: the stored type, no sniffing, same-origin
 * only, inline, browser-only caching. The strong ETag lets Express answer a revalidation with 304.
 */
export function sendLinkImage(res: Response, image: StoredLinkImage): void {
  res
    .status(200)
    .setHeader('Content-Type', image.contentType)
    .setHeader('X-Content-Type-Options', 'nosniff')
    .setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    .setHeader('Content-Disposition', 'inline')
    .setHeader('Cache-Control', IMAGE_CACHE_CONTROL)
    .setHeader('Vary', 'Cookie')
    .setHeader('ETag', `"${image.sha256}"`)
    .send(image.bytes);
}
