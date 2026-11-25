import type { HelpArticle } from './help-article.interface';

/** One hit of the help search: the article and the text line to show under its title. */
export interface HelpSearchResult {
  readonly article: HelpArticle;
  /** The sentence that matched best (the lead when only the title matched). */
  readonly snippet: string;
}
