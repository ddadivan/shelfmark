/**
 * `v` of the image paths of a link whose capture is pending after a URL change (ADR 0027 note).
 * Not a hash: the web must not bind such a path, it calls the capture endpoint instead.
 */
export const LINK_IMAGE_PENDING_VERSION = 'pending';
