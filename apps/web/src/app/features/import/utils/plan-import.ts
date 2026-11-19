import { normalizeUrl, stripTrackingParams, type ImportFolder } from '@shelfmark/contracts';
import { isStorableUrl } from './storable-url';
import type { ImportPlan } from '../models/import-plan.interface';
import type { ImportPlanOptions } from '../models/import-plan-options.interface';
import type { ImportPlanLink } from '../models/import-plan-link.interface';
import type { ImportReviewCounts } from '../models/import-review-counts.interface';
import type { ParsedImport } from '../models/parsed-import.interface';
import type { ParsedImportLink } from '../models/parsed-import-link.interface';

/** The address a link is saved under: tracking parameters dropped, like every save. */
export function importUrl(link: ParsedImportLink): string {
  return stripTrackingParams(link.url);
}

/** Indexes of links whose saved address repeats an earlier link of the same file. */
export function repeatIndexes(links: readonly ParsedImportLink[]): Set<number> {
  const seen = new Set<string>();
  const repeats = new Set<number>();
  links.forEach((link, index) => {
    const key = normalizeUrl(importUrl(link));
    if (seen.has(key)) {
      repeats.add(index);
    } else {
      seen.add(key);
    }
  });
  return repeats;
}

/** The numbers of the review step; a link both saved and repeated counts once, as saved. */
export function reviewCounts(parsed: ParsedImport, saved: ReadonlySet<number>): ImportReviewCounts {
  const repeats = repeatIndexes(parsed.links);
  let repeatsOnly = 0;
  for (const index of repeats) {
    if (!saved.has(index)) repeatsOnly += 1;
  }
  return {
    links: parsed.links.length,
    folders: parsed.folders.length,
    saved: saved.size,
    repeats: repeatsOnly,
  };
}

/**
 * What to send: with "Skip duplicates" the links already saved and the repeats inside the file are
 * left out; with "Keep the folder structure" the file's folders that still hold a link are created
 * below the target, otherwise every link goes to the target.
 */
export function planImport(
  parsed: ParsedImport,
  saved: ReadonlySet<number>,
  options: ImportPlanOptions,
): ImportPlan {
  const repeats = repeatIndexes(parsed.links);
  const links: ImportPlanLink[] = [];
  parsed.links.forEach((link, index) => {
    if (!isStorableUrl(importUrl(link))) {
      return;
    }
    if (options.skipDuplicates && (saved.has(index) || repeats.has(index))) {
      return;
    }
    links.push({
      folderKey: options.keepStructure ? link.folderKey : null,
      item: {
        url: importUrl(link),
        idempotencyKey: options.newKey(),
        ...(link.title !== undefined && { title: link.title }),
        ...(link.tags.length > 0 && { tags: [...link.tags] }),
        ...(link.note !== undefined && { note: link.note }),
        ...(link.addedAt !== undefined && { addedAt: link.addedAt }),
      },
    });
  });
  if (options.limit !== undefined && links.length > options.limit) {
    links.length = Math.max(0, options.limit);
  }
  const folders = options.keepStructure ? usedFolders(parsed, links) : [];
  return { folders, links, skipped: parsed.notWeb + parsed.links.length - links.length };
}

/** The file's folders that hold one of the planned links, themselves or below them. */
function usedFolders(parsed: ParsedImport, links: readonly ImportPlanLink[]): ImportFolder[] {
  const parents = new Map(parsed.folders.map((folder) => [folder.key, folder.parentKey]));
  const used = new Set<string>();
  for (const link of links) {
    let key = link.folderKey;
    while (key !== null && !used.has(key)) {
      used.add(key);
      key = parents.get(key) ?? null;
    }
  }
  return parsed.folders
    .filter((folder) => used.has(folder.key))
    .map(({ key, parentKey, name }) => ({ key, parentKey, name }));
}
