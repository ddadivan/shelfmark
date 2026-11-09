import {
  LINK_IMAGE_KIND,
  LINK_IMAGE_PENDING_VERSION,
  type LinkImageKind,
} from '@shelfmark/contracts';

const VERSION_LENGTH = 16;

/** The route segment of each kind: `/api/links/:id/favicon` and `/api/links/:id/image`. */
export const LINK_IMAGE_SEGMENT: Readonly<Record<LinkImageKind, string>> = {
  [LINK_IMAGE_KIND.Favicon]: 'favicon',
  [LINK_IMAGE_KIND.Preview]: 'image',
};

/**
 * Same-origin URL of a stored image. `v` is a prefix of the content hash, so a new capture gets a
 * new URL and the response can be cached for a year (ADR 0027).
 */
export function linkImagePath(linkId: string, kind: LinkImageKind, sha256?: string): string {
  const version =
    sha256 === undefined ? LINK_IMAGE_PENDING_VERSION : sha256.slice(0, VERSION_LENGTH);
  return `/api/links/${linkId}/${LINK_IMAGE_SEGMENT[kind]}?v=${version}`;
}
