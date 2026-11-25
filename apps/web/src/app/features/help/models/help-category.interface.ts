import type { IconName } from '@shelfmark/ui';
import type { HelpCategoryId } from './help-category-id.type';

/** A topic of the help center: a card on the help home and a group in the topics nav. */
export interface HelpCategory {
  readonly id: HelpCategoryId;
  readonly icon: IconName;
  /** The article ids of the topic, in reading order. */
  readonly articles: readonly string[];
}
