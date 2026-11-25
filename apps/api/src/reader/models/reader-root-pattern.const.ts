/**
 * Markup that names the article's own container: class or id words of well-known blog and docs
 * layouts (`post-content`, `article-body`, `markdown-body`, Habr's `article-formatted-body`,
 * dev.to's `article-body`) and an `itemprop="articleBody"`.
 */
export const READER_ROOT_PATTERN = {
  Class:
    /(?:^|[\s_-])(?:article-body|articlebody|article-content|article-formatted-body|article__body|article__content|post-body|post-content|post__content|post-text|entry-content|entry-body|story-body|markdown-body|content-body|blog-post-content|prose|docs-content|c-garfield-the-cat|post-text-body)(?:[\s_-]|$)/i,
  ItemProp: 'articlebody',
} as const;
