/**
 * A domain rule in the JSON export (#398): its domain, the path of its folder (`null` without one,
 * or while that folder is in Trash) and its tag names. There is no import yet (#387); the shape is
 * meant to be read back by it.
 */
export interface ExportRule {
  domain: string;
  folderPath: string[] | null;
  tags: string[];
  createdAt: string;
}
