import type { HelpInlineKind } from './help-inline-kind.type';

/** One run of an article text: plain, a control name or a key cap. */
export interface HelpInlineSegment {
  readonly kind: HelpInlineKind;
  readonly text: string;
}
