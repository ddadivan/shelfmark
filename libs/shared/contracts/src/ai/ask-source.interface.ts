import type { LinkResponse } from '../links/link-response.interface';

/** A cited link of the user, re-read live after the answer. */
export interface AskSource {
  /** The citation number used by `cite` events. */
  n: number;
  link: LinkResponse;
}
