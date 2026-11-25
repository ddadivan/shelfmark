import type { HelpCategoryId } from './help-category-id.type';
import type { HelpSection } from './help-section.interface';

/**
 * One help article. Its texts live under `help.articles.<id>.` (`title`, `lead` and the keys its
 * blocks name), so every language has them.
 */
export interface HelpArticle {
  readonly id: string;
  readonly category: HelpCategoryId;
  /** Reading time in minutes. */
  readonly minutes: number;
  /** The day the article was last changed (ISO date). */
  readonly updated: string;
  /** Ids of up to four articles to read next. */
  readonly related: readonly string[];
  readonly sections: readonly HelpSection[];
}
