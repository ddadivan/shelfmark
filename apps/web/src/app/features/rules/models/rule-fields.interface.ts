/** The fields of a save form a rule fills: the folder and the tags. */
export interface RuleFields {
  folderId: string | null;
  tags: readonly string[];
}
