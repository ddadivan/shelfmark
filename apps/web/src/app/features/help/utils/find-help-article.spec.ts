import { describe, expect, it } from 'vitest';
import { HELP_ARTICLES } from '../models/help-articles.const';
import { HELP_CATEGORIES } from '../models/help-categories.const';
import { HELP_POPULAR } from '../models/help-popular.const';
import { findHelpArticle, helpArticleNeighbours } from './find-help-article';

describe('help articles', () => {
  it('finds an article by id and not an unknown one', () => {
    expect(findHelpArticle('rules')?.id).toBe('rules');
    expect(findHelpArticle('nope')).toBeUndefined();
    expect(findHelpArticle(null)).toBeUndefined();
  });

  it('gives the neighbours in reading order', () => {
    expect(helpArticleNeighbours('rules')).toEqual({
      previous: findHelpArticle('tags'),
      next: findHelpArticle('favorites-pins'),
    });
    expect(helpArticleNeighbours(HELP_ARTICLES[0].id).previous).toBeUndefined();
    expect(helpArticleNeighbours('nope')).toEqual({ previous: undefined, next: undefined });
  });

  it('has unique ids, and every id in a topic, popular list and related list exists', () => {
    const ids = HELP_ARTICLES.map((article) => article.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const category of HELP_CATEGORIES) {
      for (const id of category.articles) {
        expect(findHelpArticle(id)?.category).toBe(category.id);
      }
    }
    expect(HELP_CATEGORIES.flatMap((category) => category.articles).sort()).toEqual(
      [...ids].sort(),
    );
    for (const id of HELP_POPULAR) {
      expect(findHelpArticle(id)).toBeDefined();
    }
    for (const article of HELP_ARTICLES) {
      for (const id of article.related) {
        expect(findHelpArticle(id)).toBeDefined();
      }
    }
  });
});
