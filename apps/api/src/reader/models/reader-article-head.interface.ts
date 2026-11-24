/** What the page's `<head>` (and `<time>`) says about the article; every field may be unknown. */
export interface ReaderArticleHead {
  title: string | null;
  author: string | null;
  /** ISO time. */
  publishedAt: string | null;
}
