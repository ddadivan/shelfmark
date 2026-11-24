import type { IconName } from '@shelfmark/ui';
import type { AskStarter } from './ask-starter.interface';

/** One "what Ask can do" card before it is translated: its title key, glyph and example questions. */
export interface AskStarterGroupSpec {
  readonly titleKey: string;
  readonly icon: IconName;
  readonly questions: readonly AskStarter[];
}
