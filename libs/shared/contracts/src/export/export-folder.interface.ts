/** A folder in the JSON export. `path` holds the names from the top-level folder down to this one. */
export interface ExportFolder {
  path: string[];
  createdAt: string;
  updatedAt: string;
}
