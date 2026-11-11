import type { LINK_KEY_INTENT } from './link-key-intent.const';

export type LinkKeyIntent = (typeof LINK_KEY_INTENT)[keyof typeof LINK_KEY_INTENT];
