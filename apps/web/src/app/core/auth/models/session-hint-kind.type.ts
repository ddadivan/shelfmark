import type { SESSION_HINT_KIND } from './session-hint-kind.const';

/** One of `SESSION_HINT_KIND`. */
export type SessionHintKind = (typeof SESSION_HINT_KIND)[keyof typeof SESSION_HINT_KIND];
