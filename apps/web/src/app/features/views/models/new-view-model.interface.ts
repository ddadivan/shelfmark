/**
 * The form of the new view dialog: the phrase, the filter rows as the controls hold them and the
 * name. `where` is a `VIEW_WHERE` value or a folder id; `kind` is `ALL_KINDS` or a link kind; `sort`
 * is a `FEED_SORT` value.
 */
export interface NewViewModel {
  phrase: string;
  where: string;
  kind: string;
  tags: string[];
  q: string;
  sort: string;
  name: string;
}
