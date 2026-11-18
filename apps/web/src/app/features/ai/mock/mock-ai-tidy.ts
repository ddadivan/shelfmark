import { inject, Service } from '@angular/core';
import {
  LINK_LIMIT,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  TIDY_LIMIT,
  type LinkResponse,
  type LinkSuggestion,
  type TidyApplyRequest,
  type TidyApplyResponse,
  type TidyItem,
  type TidyListResponse,
  type TidyUndoItem,
  type TidyUndoRequest,
  type TidyUndoResponse,
} from '@shelfmark/contracts';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { normalizeLinkTags } from '../../links/mock/normalize-link-tags';
import { MockAiData } from './mock-ai-data';

function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Newest first, like the API (`created_at DESC, id DESC`): > 0 when `a` comes after `b`. */
function newestFirst(
  a: Pick<LinkResponse, 'createdAt' | 'id'>,
  b: Pick<LinkResponse, 'createdAt' | 'id'>,
): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}

/**
 * Tidy Unsorted in the mock (AI-2), like the API: the list holds the live links in Unsorted with
 * at least one `suggested` row after filtering (a folder only while it is live and no rule decides
 * the folder, tags not yet on the link, a new tag whose name exists now reads as a tag). Apply
 * writes only the selected own rows, never a folder over one the user chose meanwhile, at most
 * `LINK_LIMIT.TagsMax` tags, no folder where a rule decides it (checked again at apply); applied rows leave the list (accepted) and Undo brings them back.
 */
@Service()
export class MockAiTidy {
  private readonly ai = inject(MockAiData);
  private readonly library = inject(MockLibraryData);
  /** Rows a run accepted, per link: Undo makes them `suggested` again. */
  private readonly accepted = new Map<string, LinkSuggestion[]>();

  /** `GET /api/ai/tidy`, after the link `after` when it is listed or known; AI off answers []. */
  list(after?: string): TidyListResponse {
    const all = this.items();
    const cursor = this.library.links.find((link) => link.id === after);
    const items = cursor ? all.filter((item) => newestFirst(item.link, cursor) > 0) : all;
    return { items: items.slice(0, TIDY_LIMIT.PageMax), total: items.length };
  }

  /** `GET /api/ai/tidy/count`. */
  count(): number {
    return this.items().length;
  }

  /** `POST /api/ai/tidy/apply`; `null` while AI is off (409). */
  apply(request: TidyApplyRequest): TidyApplyResponse | null {
    if (!this.ai.settings.enabled) {
      return null;
    }
    this.ai.settle();
    const changed: LinkResponse[] = [];
    const undo: TidyUndoItem[] = [];
    let folders = 0;
    let tagsAdded = 0;
    let skipped = 0;
    const now = new Date().toISOString();
    for (const item of request.items) {
      const link = this.library.links.find((entry) => entry.id === item.linkId);
      if (!link) {
        continue;
      }
      const wanted = new Set(item.suggestionIds);
      const open = this.ai.suggestionsOf(link.id);
      const chosen = open.filter(
        (row) => wanted.has(row.id) && row.state === SUGGESTION_STATE.Suggested,
      );
      const folderRow = chosen.find((row) => row.kind === SUGGESTION_KIND.Folder);
      const folderId =
        folderRow?.folderId &&
        link.folderId === null &&
        this.liveFolder(folderRow.folderId) &&
        this.library.ruleEffect(link.url)?.folderId == null
          ? folderRow.folderId
          : null;
      const tags = [...link.tags];
      const added: string[] = [];
      const used: LinkSuggestion[] = folderId === null || !folderRow ? [] : [folderRow];
      for (const row of chosen) {
        if (row.kind === SUGGESTION_KIND.Folder || row.tagName === null) {
          continue;
        }
        // Already on the link (or picked twice): the row stays suggested and is not counted.
        if (tags.some((tag) => sameName(tag, row.tagName ?? ''))) {
          continue;
        }
        if (tags.length >= LINK_LIMIT.TagsMax) {
          skipped++;
          continue;
        }
        const name = this.tagName(row.tagName);
        tags.push(name);
        added.push(name);
        used.push(row);
      }
      if (folderId === null && added.length === 0) {
        continue;
      }
      this.library.ensureTags(added);
      const next: LinkResponse = {
        ...link,
        folderId: folderId ?? link.folderId,
        tags: normalizeLinkTags(tags),
        updatedAt: now,
      };
      this.library.links = this.library.links.map((entry) => (entry.id === next.id ? next : entry));
      this.ai.linkEdited(link.id, folderId !== null, added.length > 0);
      const usedIds = new Set(used.map((row) => row.id));
      this.ai.setSuggestions(
        link.id,
        this.ai.suggestionsOf(link.id).filter((row) => !usedIds.has(row.id)),
      );
      this.accepted.set(link.id, [...(this.accepted.get(link.id) ?? []), ...used]);
      folders += folderId === null ? 0 : 1;
      tagsAdded += added.length;
      changed.push(this.library.linkView(next));
      undo.push({ linkId: link.id, folderId, tags: added, suggestionIds: [...usedIds] });
    }
    return {
      links: changed,
      applied: changed.length,
      folders,
      tagsAdded,
      skipped,
      undo: { items: undo },
    };
  }

  /** `POST /api/ai/tidy/undo`: only where the run's change is still there; works with AI off. */
  undo(request: TidyUndoRequest): TidyUndoResponse {
    const changed: LinkResponse[] = [];
    for (const item of request.items) {
      const link = this.library.links.find((entry) => entry.id === item.linkId);
      if (!link) {
        continue;
      }
      const moveBack = item.folderId !== null && link.folderId === item.folderId;
      const tags = link.tags.filter((tag) => !item.tags.some((name) => sameName(name, tag)));
      const next: LinkResponse = {
        ...link,
        ...(moveBack && { folderId: null, pinnedInFolderAt: null }),
        tags,
      };
      const ids = new Set(item.suggestionIds);
      const stash = this.accepted.get(link.id) ?? [];
      const back = stash.filter((row) => ids.has(row.id));
      this.accepted.set(
        link.id,
        stash.filter((row) => !ids.has(row.id)),
      );
      this.ai.setSuggestions(link.id, [...this.ai.suggestionsOf(link.id), ...back]);
      if (moveBack || tags.length !== link.tags.length) {
        this.library.links = this.library.links.map((entry) =>
          entry.id === next.id ? next : entry,
        );
        changed.push(this.library.linkView(next));
      }
    }
    return { links: changed };
  }

  private items(): TidyItem[] {
    if (!this.ai.settings.enabled) {
      return [];
    }
    this.ai.settle();
    return this.library.links
      .filter((link) => link.folderId === null)
      .sort(newestFirst)
      .flatMap((link): TidyItem[] => {
        const suggestions = this.open(link);
        return suggestions.length > 0 ? [{ link: this.library.linkView(link), suggestions }] : [];
      });
  }

  /** The rows of a link Tidy lists, filtered like the API. */
  private open(link: LinkResponse): LinkSuggestion[] {
    const ruleDecides = this.library.ruleEffect(link.url)?.folderId != null;
    return this.ai.suggestionsOf(link.id).flatMap((row): LinkSuggestion[] => {
      if (row.state !== SUGGESTION_STATE.Suggested) {
        return [];
      }
      if (row.kind === SUGGESTION_KIND.Folder) {
        return row.folderId !== null && this.liveFolder(row.folderId) && !ruleDecides ? [row] : [];
      }
      const name = row.tagName;
      if (name === null || link.tags.some((tag) => sameName(tag, name))) {
        return [];
      }
      const exists = this.library.tagList.some((tag) => sameName(tag.name, name));
      return [
        row.kind === SUGGESTION_KIND.NewTag && exists ? { ...row, kind: SUGGESTION_KIND.Tag } : row,
      ];
    });
  }

  private liveFolder(id: string): boolean {
    return this.library.folderList.some((folder) => folder.id === id);
  }

  /** An existing tag's spelling, else the suggested name (a new tag). */
  private tagName(name: string): string {
    return this.library.tagList.find((tag) => sameName(tag.name, name))?.name ?? name;
  }
}
