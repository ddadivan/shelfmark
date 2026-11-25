import { HELP_ARTICLES } from '../models/help-articles.const';
import type { HelpArticle } from '../models/help-article.interface';

/** The article with this id, or undefined for an id that does not exist. */
export function findHelpArticle(id: string | null | undefined): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.id === id);
}

/** The articles before and after this one in reading order (undefined at the ends). */
export function helpArticleNeighbours(id: string): {
  readonly previous: HelpArticle | undefined;
  readonly next: HelpArticle | undefined;
} {
  const index = HELP_ARTICLES.findIndex((article) => article.id === id);
  if (index < 0) {
    return { previous: undefined, next: undefined };
  }
  return { previous: HELP_ARTICLES[index - 1], next: HELP_ARTICLES[index + 1] };
}
