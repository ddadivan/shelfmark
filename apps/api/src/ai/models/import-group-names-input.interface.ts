import type { ImportGroupNamesGroup } from './import-group-names-group.interface';

/**
 * One request to name the clusters of an import (ADR 0056 decision 10): sample titles per cluster
 * and the file's folder names as hints, in the language the names are written in. Titles and folder
 * names are untrusted data.
 */
export interface ImportGroupNamesInput {
  language: string;
  folderNames: string[];
  groups: ImportGroupNamesGroup[];
}
