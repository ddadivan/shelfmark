import type { LinkFraming } from './link-framing.type';

/**
 * `POST /api/links/:id/frame-check` (#553, ADR 0059): can the page of one of your links be shown
 * in the preview frame. The answer is cached per host on the server. A `blocked` host is added to
 * your `previewNewTabHosts` (Settings › Library › Sites that open in a new tab) unless it is there
 * already or the list is full; `addedToNewTabHosts` tells the web app to update its copy.
 */
export interface LinkFrameCheckResponse {
  linkId: string;
  /** The host of the link (`linkHost`), the key of the cache and of `previewNewTabHosts`. */
  host: string;
  framing: LinkFraming;
  /** When the host was last checked (ISO 8601). */
  checkedAt: string;
  addedToNewTabHosts: boolean;
}
