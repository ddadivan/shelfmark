/**
 * The key a link list is ordered by for "Title A–Z": the title in lower case. Stored in
 * `links.title_sort_key`, so the API and the web mock order alike.
 */
export function linkTitleSortKey(title: string): string {
  return title.toLowerCase();
}
