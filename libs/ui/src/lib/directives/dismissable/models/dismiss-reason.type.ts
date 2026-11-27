import type { DISMISS_REASON } from './dismiss-reason.const';

export type DismissReason = (typeof DISMISS_REASON)[keyof typeof DISMISS_REASON];
