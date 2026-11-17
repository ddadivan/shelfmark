import type { LinkResponse } from './link-response.interface';

/**
 * `POST /api/links/lookup` response: the user's newest live link whose normalised URL matches the
 * sent one (after the tracking parameters the save would drop), or `null`. The page is never fetched.
 */
export interface LinkLookupResponse {
  link: LinkResponse | null;
}
