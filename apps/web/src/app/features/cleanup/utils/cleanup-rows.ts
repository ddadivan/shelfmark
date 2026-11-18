import {
  CLEANUP_SOURCE,
  linkHost,
  type CleanupApplyRequest,
  type CleanupReport,
} from '@shelfmark/contracts';
import type { CleanupDuplicateRow } from '../models/cleanup-duplicate-row.interface';
import type { CleanupTagRow } from '../models/cleanup-tag-row.interface';

/** The duplicate rows of a report; `folderName` answers `null` for Unsorted or a folder gone. */
export function duplicateRows(
  report: CleanupReport | null,
  deselected: ReadonlySet<string>,
  folderName: (id: string) => string | null,
): CleanupDuplicateRow[] {
  return (report?.duplicates ?? []).map((group) => {
    const hosts = [group.keep, ...group.copies].map((link) => linkHost(link.url) ?? link.url);
    return {
      id: group.id,
      title: group.keep.title,
      reason: group.reason,
      ai: group.source === CLEANUP_SOURCE.Ai,
      copies: group.copies.length,
      keepReason: group.keepReason,
      place: group.keep.folderId === null ? null : folderName(group.keep.folderId),
      hosts: [...new Set(hosts)],
      selected: !deselected.has(group.id),
    };
  });
}

/** The similar-tags rows of a report, with the swapped pairs turned round. */
export function tagRows(
  report: CleanupReport | null,
  deselected: ReadonlySet<string>,
  swapped: ReadonlySet<string>,
): CleanupTagRow[] {
  return (report?.similarTags ?? []).map((pair) => {
    const turned = swapped.has(pair.id);
    return {
      id: pair.id,
      ai: pair.source === CLEANUP_SOURCE.Ai,
      keep: turned ? pair.merge : pair.keep,
      merge: turned ? pair.keep : pair.merge,
      selected: !deselected.has(pair.id),
    };
  });
}

/** "Apply {n} changes": every copy of a selected group plus every selected merge. */
export function applyCount(
  duplicates: readonly CleanupDuplicateRow[],
  tags: readonly CleanupTagRow[],
): number {
  return (
    duplicates.reduce((sum, row) => sum + (row.selected ? row.copies : 0), 0) +
    tags.filter((row) => row.selected).length
  );
}

/** The apply body of the selected rows: all copies of each group, the chosen keep of each pair. */
export function applyRequest(
  report: CleanupReport | null,
  deselected: ReadonlySet<string>,
  swapped: ReadonlySet<string>,
): CleanupApplyRequest {
  return {
    duplicates: (report?.duplicates ?? [])
      .filter((group) => !deselected.has(group.id))
      .map((group) => ({ groupId: group.id, trashIds: group.copies.map((copy) => copy.id) })),
    tagMerges: tagRows(report, deselected, swapped)
      .filter((row) => row.selected)
      .map((row) => ({ pairId: row.id, keepTagId: row.keep.id })),
  };
}
