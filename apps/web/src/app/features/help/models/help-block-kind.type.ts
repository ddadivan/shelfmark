import type { HELP_BLOCK } from './help-block-kind.const';

export type HelpBlockKind = (typeof HELP_BLOCK)[keyof typeof HELP_BLOCK];
