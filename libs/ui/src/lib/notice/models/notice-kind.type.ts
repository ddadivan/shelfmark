import type { NOTICE_KIND } from './notice-kind.const';

export type NoticeKind = (typeof NOTICE_KIND)[keyof typeof NOTICE_KIND];
