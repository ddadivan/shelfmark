import { SHELFMARK_ORIGIN } from '../../core/config/shelfmark-origin.const';

const PENDING = 'v=pending';

/**
 * A link's same-origin image path (`/api/links/:id/image?v=…`) as an absolute URL on the Shelfmark
 * origin, or `undefined` while there is none or its capture is still pending. Anything that is not a
 * plain `/api/` path is ignored, so the popup only ever loads images from the Shelfmark API.
 */
export function toAppAsset(path: string | null): string | undefined {
  if (path === null || !path.startsWith('/api/') || path.includes(PENDING)) return undefined;
  return `${SHELFMARK_ORIGIN}${path}`;
}
