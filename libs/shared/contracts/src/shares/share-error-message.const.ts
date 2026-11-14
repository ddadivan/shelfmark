import { SHARE_LIMIT } from './share-limit.const';

/** Error messages of the sharing API, one place so the service, the tests and the web agree. */
export const SHARE_ERROR_MESSAGE = {
  /** The one answer for an unknown, disabled or reset token and for anything outside the subtree. */
  NotFound: 'Collection not found',
  LimitReached: `Public folder limit reached (${SHARE_LIMIT.PerUserMax})`,
  DemoUser: 'Demo accounts cannot share folders',
} as const;
