/** A folder read from an import file; parents come before their children. */
export interface ParsedImportFolder {
  /** Unique within the file ("f1", "f2", …). */
  readonly key: string;
  /** `null` = a top-level folder of the file. */
  readonly parentKey: string | null;
  readonly name: string;
}
