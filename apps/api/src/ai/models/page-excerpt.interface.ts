/** What an AI job reads from a link's page; both `null` when the page could not be read. */
export interface PageExcerpt {
  excerpt: string | null;
  description: string | null;
}
