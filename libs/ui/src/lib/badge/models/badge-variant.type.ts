import type { BADGE_VARIANT } from './badge-variant.const';

export type BadgeVariant = (typeof BADGE_VARIANT)[keyof typeof BADGE_VARIANT];
