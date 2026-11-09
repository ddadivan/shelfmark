import type { LinkResponse } from './link-response.interface';

/**
 * `POST /api/links/:id/images/capture` response: the link as it is after the call, always 200.
 * A claimed capture that stored images carries the new `?v=<hash>` paths; a call that did not
 * claim the capture (cooldown, another request is running) or found nothing carries the link as is.
 */
export type CaptureLinkImagesResponse = LinkResponse;
