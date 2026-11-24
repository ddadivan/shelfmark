/**
 * The form of the new view dialog: the phrase, the filter rows as the controls hold them, the name
 * and the icon. `where` is a `VIEW_WHERE` value or a folder id; `kind` is `ALL_KINDS` or a link
 * kind; `sort` is a `FEED_SORT` value; `saved` is `VIEW_SAVED_ANY` or a `SAVED_WITHIN` value;
 * `icon` is `''` (none) or a `SAVED_VIEW_ICON` value.
 */
export interface NewViewModel {
  phrase: string;
  where: string;
  kind: string;
  tags: string[];
  q: string;
  sort: string;
  saved: string;
  favorite: boolean;
  name: string;
  icon: string;
}
