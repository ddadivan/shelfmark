/** A folder of the file in `StartImportRequest`; parents come before their children. */
export interface ImportFolder {
  /** Client key, unique within the request (1 to 64 characters). */
  key: string;
  /** Key of an earlier folder of the request; `null` = directly under the target. */
  parentKey: string | null;
  /** 1 to `FOLDER_LIMIT.NameMax` characters, no control characters. */
  name: string;
}
