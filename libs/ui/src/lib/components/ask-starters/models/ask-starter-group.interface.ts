import type { IconName } from '../../icon/models/icon-name.type';

/** One card of `ui-ask-starters`: what Ask can do ("Find") and example questions for it. */
export interface AskStarterGroup {
  /** The card heading, translated ("Count and compare"). */
  readonly title: string;
  /** The 16px muted glyph before the heading. */
  readonly icon: IconName;
  /** Example questions, translated; pressing one emits it. */
  readonly questions: readonly string[];
}
