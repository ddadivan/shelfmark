import type { AskErrorReason } from '@shelfmark/contracts';
import type { ASK_CLIENT_REASON } from './ask-client-reason.const';

/** Why an Ask entry ended with `error` or `limit`: a stream reason or a web-only one. */
export type AskEntryReason =
  AskErrorReason | (typeof ASK_CLIENT_REASON)[keyof typeof ASK_CLIENT_REASON];
