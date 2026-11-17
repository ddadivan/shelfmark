/** Which fields of a save form the user chose (the rule then leaves them alone). */
export interface RuleLocks {
  folder: boolean;
  tags: boolean;
  /** Whether the rule's folder is one the form can show (live and known). */
  folderKnown: boolean;
}
