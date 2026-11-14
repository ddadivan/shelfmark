/** The columns of a rule row the API reads. */
export interface RuleRow {
  id: string;
  domain: string;
  folderId: string | null;
  tagNames: string[];
  createdAt: Date;
}
