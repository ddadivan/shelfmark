import {
  FOLDER_LIMIT,
  IMPORT_LIMIT,
  type ImportGroupLink,
  type ImportGroupsRequest,
} from '@shelfmark/contracts';
import type { ImportPlan } from '../models/import-plan.interface';
import type { ParsedImport } from '../models/parsed-import.interface';
import { cleanLine } from './clean-text';

/**
 * The body of `POST /api/imports/groups` for a flat plan: title (or address) and address of every
 * link in plan order, cut to the API's limits, and the file's folder names as hints (distinct, at
 * most `GroupFolderNamesMax`).
 */
export function groupsRequest(plan: ImportPlan, parsed: ParsedImport): ImportGroupsRequest {
  const links: ImportGroupLink[] = plan.links.map(({ item }) => ({
    title: cleanLine(item.title ?? item.url, IMPORT_LIMIT.GroupTitleMax) || item.url,
    url: item.url.slice(0, IMPORT_LIMIT.GroupUrlMax),
  }));
  const names = new Set<string>();
  for (const folder of parsed.folders) {
    const name = cleanLine(folder.name, FOLDER_LIMIT.NameMax);
    if (name !== '') names.add(name);
  }
  return { links, folderNames: [...names].slice(0, IMPORT_LIMIT.GroupFolderNamesMax) };
}
