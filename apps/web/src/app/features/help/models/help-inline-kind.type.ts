import type { HELP_INLINE } from './help-inline-kind.const';

export type HelpInlineKind = (typeof HELP_INLINE)[keyof typeof HELP_INLINE];
