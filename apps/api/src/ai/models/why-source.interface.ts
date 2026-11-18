/** What "why it matched" may quote of a link: its tag names, folder name and summary. */
export interface WhySource {
  tagNames: readonly string[];
  folderName: string | null;
  summary: string | null;
}
