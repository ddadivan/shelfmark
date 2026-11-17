/** A domain rule as the mock keeps it (#398): the stored row, without derived fields. */
export interface MockRule {
  id: string;
  domain: string;
  folderId: string | null;
  tags: string[];
  createdAt: string;
}
