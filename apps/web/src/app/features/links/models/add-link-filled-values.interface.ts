/** The values one fill put into the Add link form; `null` where it changed nothing. */
export interface AddLinkFilledValues {
  url: string | undefined;
  folderId: string | null;
  tags: readonly string[];
  summary: string | null;
  title: string | null;
}
