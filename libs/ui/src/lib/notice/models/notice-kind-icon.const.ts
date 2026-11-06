import type { IconName } from '../../icon/models/icon-name.type';
import { NOTICE_KIND } from './notice-kind.const';
import type { NoticeKind } from './notice-kind.type';

/** The icon a notice shows by default for its kind. */
export const NOTICE_KIND_ICON = {
  [NOTICE_KIND.Warning]: 'warning',
  [NOTICE_KIND.Danger]: 'error',
} as const satisfies Record<NoticeKind, IconName>;
