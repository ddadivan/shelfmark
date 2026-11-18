import { inject, Service } from '@angular/core';
import {
  AI_QUOTA,
  AI_SEARCH_STATE,
  AI_TIER,
  CLEANUP_LIMIT,
  CLEANUP_SOURCE,
  CLEANUP_STATE,
  DUPLICATE_REASON,
  TRASH_ITEM_KIND,
  type CleanupApplyRequest,
  type CleanupApplyResponse,
  type CleanupDuplicateGroup,
  type CleanupReport,
  type CleanupState,
  type CleanupSummary,
  type CleanupTag,
  type CleanupTagPair,
  type CleanupUndoRequest,
  type CleanupUndoResponse,
  type TagResponse,
} from '@shelfmark/contracts';
import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
import { MockAiData } from '../../ai/mock/mock-ai-data';
import { utcMonth } from '../../ai/mock/mock-ai-account';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { normalizeLinkTags } from '../../links/mock/normalize-link-tags';
import { exactDuplicateIds, nearDuplicateIds } from './find-duplicates';
import type { MockCleanupGroup } from './models/mock-cleanup-group.interface';
import type { MockCleanupPair } from './models/mock-cleanup-pair.interface';
import type { MockCleanupRun } from './models/mock-cleanup-run.interface';
import type { MockCleanupUndo } from './models/mock-cleanup-undo.interface';
import type { MockUndoMerge } from './models/mock-undo-merge.interface';
import { MOCK_CLEANUP_STORAGE_KEY } from './models/mock-cleanup-storage-key.const';
import { MOCK_CLEANUP_TIMING } from './models/mock-cleanup-timing.const';
import { MOCK_TAG_SYNONYMS } from './models/mock-tag-synonyms.const';
import { pickKeep } from './pick-keep';
import { tagVariantKey } from './tag-variant-key';

const MS_PER_MINUTE = 60_000;

/** A 12-character id like the API's (new on every run). */
function newId(): string {
  return globalThis.crypto.randomUUID().replaceAll('-', '').slice(0, 12);
}

function readDismissedAt(): number | null {
  try {
    const value = Number(globalThis.localStorage.getItem(MOCK_CLEANUP_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * The library clean-up in the mock (AI-5, ADR 0052), like the API: rule checks (exact duplicates,
 * tag variants) in the run request; with AI checks (AI on, AI pack, a run left this month) a
 * deferred pass of `MOCK_CLEANUP_TIMING.PassMs` adds "Same page" groups (the mock vectors: same
 * title, tags and summary on the same host family) and tag synonyms (`MOCK_TAG_SYNONYMS`). The
 * report stores ids only and is read live; apply trashes copies with one shared time and merges
 * tags; it holds the latest run's Undo (single-use, `UndoWindowMinutes`), and Undo by run id
 * reverts what is still as the run left it.
 */
@Service()
export class MockCleanupData {
  private readonly library = inject(MockLibraryData);
  private readonly ai = inject(MockAiData);
  private report: MockCleanupRun | null = null;
  private runs = { month: '', used: 0 };
  private pendingUndo: MockCleanupUndo | null = null;

  /** `GET /api/cleanup`. */
  read(now: number = Date.now()): CleanupReport {
    this.advance(now);
    const run = this.report;
    if (run === null) {
      return {
        state: CLEANUP_STATE.None,
        checked: 0,
        total: 0,
        checkedAt: null,
        aiIncluded: false,
        aiAvailable: this.aiAvailable(now),
        duplicates: [],
        similarTags: [],
      };
    }
    const progress = Math.min(1, (now - run.startedAt) / MOCK_CLEANUP_TIMING.PassMs);
    return {
      state: run.state,
      checked: run.state === CLEANUP_STATE.Running ? Math.floor(run.total * progress) : run.total,
      total: run.total,
      checkedAt: new Date(run.startedAt).toISOString(),
      aiIncluded: run.includeAi,
      aiAvailable: this.aiAvailable(now),
      duplicates: this.liveGroups(run.duplicates, now),
      similarTags: this.livePairs(run.similarTags),
    };
  }

  /** The state for the AI tick, after moving the deferred pass on. */
  state(now: number = Date.now()): CleanupState {
    this.advance(now);
    return this.report?.state ?? CLEANUP_STATE.None;
  }

  /** `POST /api/cleanup/run`; `null` while a run is still going (409). */
  run(includeAi: boolean, now: number = Date.now()): CleanupReport | null {
    this.advance(now);
    if (this.report?.state === CLEANUP_STATE.Running) {
      return null;
    }
    const withAi = includeAi && this.aiAvailable(now);
    if (withAi) {
      this.countRun(now, 1);
    }
    const duplicates = exactDuplicateIds(this.library.links).map((linkIds): MockCleanupGroup => ({
      id: newId(),
      reason: DUPLICATE_REASON.SameAddress,
      source: CLEANUP_SOURCE.Rule,
      linkIds,
    }));
    this.report = {
      state: withAi ? CLEANUP_STATE.Running : CLEANUP_STATE.Ready,
      includeAi: withAi,
      total:
        withAi && this.ai.searchStatus().state === AI_SEARCH_STATE.Ready
          ? this.library.links.length
          : 0,
      startedAt: now,
      pending: withAi,
      duplicates,
      similarTags: this.tagVariants(),
    };
    return this.read(now);
  }

  /** `POST /api/cleanup/apply` (validated by the caller). */
  apply(request: CleanupApplyRequest, now: number = Date.now()): CleanupApplyResponse {
    this.advance(now);
    const run = this.report;
    const deletedAt = new Date(now).toISOString();
    const trashedIds: string[] = [];
    const merges: MockUndoMerge[] = [];
    let skipped = 0;
    for (const item of request.duplicates) {
      const group = run?.duplicates.find((entry) => entry.id === item.groupId);
      const live = new Set(
        (group?.linkIds ?? []).filter((id) => this.library.links.some((link) => link.id === id)),
      );
      const wanted = new Set(item.trashIds);
      if (
        !group ||
        wanted.size === 0 ||
        [...wanted].some((id) => !live.has(id)) ||
        wanted.size >= live.size
      ) {
        skipped++;
        continue;
      }
      for (const link of this.library.links.filter((entry) => wanted.has(entry.id))) {
        this.library.trashLink(link);
        trashedIds.push(link.id);
      }
    }
    const trashed = new Set(trashedIds);
    // One shared Trash time for the whole run, like the API's single `deleted_at`.
    this.library.trash = this.library.trash.map((entry) =>
      entry.kind === TRASH_ITEM_KIND.Link && trashed.has(entry.id)
        ? { ...entry, deletedAt }
        : entry,
    );
    for (const item of request.tagMerges) {
      const pair = run?.similarTags.find((entry) => entry.id === item.pairId);
      const keep = this.tag(item.keepTagId);
      const otherId = pair?.tagIds.find((id) => id !== item.keepTagId);
      const other = otherId === undefined ? undefined : this.tag(otherId);
      if (!pair || !pair.tagIds.includes(item.keepTagId) || !keep || !other) {
        skipped++;
        continue;
      }
      merges.push(this.merge(other, keep));
    }
    if (trashedIds.length === 0 && merges.length === 0) {
      return { trashed: 0, merged: 0, skipped, trashedIds, undo: null };
    }
    if (run) {
      run.state = CLEANUP_STATE.Applied;
    }
    const runId = globalThis.crypto.randomUUID();
    this.pendingUndo = {
      runId,
      until: now + CLEANUP_LIMIT.UndoWindowMinutes * MS_PER_MINUTE,
      deletedAt: trashedIds.length > 0 ? deletedAt : null,
      trashedIds,
      merges,
    };
    return {
      trashed: trashedIds.length,
      merged: merges.length,
      skipped,
      trashedIds,
      undo: { runId },
    };
  }

  /**
   * `POST /api/cleanup/undo` (validated by the caller); works with AI off. `null` (409) unless it
   * names the latest run within its window; single-use.
   */
  undo(request: CleanupUndoRequest, now: number = Date.now()): CleanupUndoResponse | null {
    const stored = this.pendingUndo;
    if (stored === null || stored.runId !== request.runId || now > stored.until) {
      return null;
    }
    this.pendingUndo = null;
    const ids = new Set(stored.trashedIds);
    const back = this.library.trash.filter(
      (entry) =>
        entry.kind === TRASH_ITEM_KIND.Link &&
        ids.has(entry.id) &&
        entry.deletedAt === stored.deletedAt &&
        entry.link,
    );
    for (const entry of back) {
      if (entry.link) {
        const folderId =
          entry.link.folderId !== null &&
          this.library.folderList.some((folder) => folder.id === entry.link?.folderId)
            ? entry.link.folderId
            : null;
        this.library.links = [{ ...entry.link, folderId }, ...this.library.links];
      }
    }
    this.library.trash = this.library.trash.filter((entry) => !back.includes(entry));
    for (const merge of stored.merges) {
      this.unmerge(merge);
    }
    if (this.report?.state === CLEANUP_STATE.Applied) {
      this.report.state = CLEANUP_STATE.Ready;
    }
    return { restored: back.length, unmerged: stored.merges.length };
  }

  /** `GET /api/cleanup/summary`. */
  summary(now: number = Date.now()): CleanupSummary {
    this.advance(now);
    const exact = exactDuplicateIds(this.library.links).length;
    const run = this.report;
    let near = 0;
    let similarTags = 0;
    if (run && (run.state === CLEANUP_STATE.Ready || run.state === CLEANUP_STATE.Failed)) {
      near = this.liveGroups(
        run.duplicates.filter((group) => group.reason !== DUPLICATE_REASON.SameAddress),
        now,
      ).length;
      similarTags = this.livePairs(run.similarTags).length;
    }
    const dismissedAt = readDismissedAt();
    const hiddenUntil =
      dismissedAt === null ? 0 : dismissedAt + CLEANUP_LIMIT.CardIntervalDays * MS_PER_DAY;
    const duplicates = exact + near;
    return { show: duplicates + similarTags > 0 && now >= hiddenUntil, duplicates, similarTags };
  }

  /** `POST /api/cleanup/card/dismiss`. */
  dismissCard(now: number = Date.now()): void {
    try {
      globalThis.localStorage.setItem(MOCK_CLEANUP_STORAGE_KEY, String(now));
    } catch {
      // Storage unavailable: the card shows again on the next read.
    }
  }

  /** `DELETE /api/ai/data` deletes the report too. */
  reset(): void {
    this.report = null;
  }

  /** AI on, the AI pack and a clean-up run left this month. */
  private aiAvailable(now: number): boolean {
    const account = this.ai.account;
    const used = this.runs.month === utcMonth(now) ? this.runs.used : 0;
    return (
      account.settings.enabled &&
      account.tier === AI_TIER.AiPack &&
      used < AI_QUOTA[account.tier].cleanupAiRunsPerMonth
    );
  }

  private countRun(now: number, delta: 1 | -1): void {
    const month = utcMonth(now);
    const used = this.runs.month === month ? this.runs.used : 0;
    this.runs = { month, used: Math.max(0, used + delta) };
  }

  /** Finishes the deferred pass once its time is up (AI turned off meanwhile: no AI groups). */
  private advance(now: number): void {
    const run = this.report;
    if (run?.state !== CLEANUP_STATE.Running || now - run.startedAt < MOCK_CLEANUP_TIMING.PassMs) {
      return;
    }
    if (run.pending && this.ai.settings.enabled) {
      if (run.total > 0) {
        const exact = new Set(run.duplicates.flatMap((group) => group.linkIds));
        for (const linkIds of nearDuplicateIds(this.library.links, exact)) {
          if (run.duplicates.length < CLEANUP_LIMIT.DuplicateGroupsMax) {
            run.duplicates.push({
              id: newId(),
              reason: DUPLICATE_REASON.SamePage,
              source: CLEANUP_SOURCE.Ai,
              linkIds,
            });
          }
        }
      }
      run.similarTags.push(...this.tagSynonyms(run.similarTags, now));
    }
    run.pending = false;
    run.state = CLEANUP_STATE.Ready;
  }

  /** Tags on live links with their counts, most used first (the API's `loadTagUsage` order). */
  private usedTags(): TagResponse[] {
    return this.library.tagsView().filter((tag) => tag.linkCount > 0);
  }

  private tag(id: string): TagResponse | undefined {
    return this.library.tagsView().find((tag) => tag.id === id);
  }

  /** Similar tags by rule: the same `tagVariantKey`; the most used tag of a set is the keep. */
  private tagVariants(): MockCleanupPair[] {
    const sets = new Map<string, string[]>();
    for (const tag of this.library.tagsView()) {
      const key = tagVariantKey(tag.name);
      if (key !== '') {
        sets.set(key, [...(sets.get(key) ?? []), tag.id]);
      }
    }
    const pairs: MockCleanupPair[] = [];
    for (const [keep, ...others] of sets.values()) {
      for (const other of others) {
        if (keep !== undefined && pairs.length < CLEANUP_LIMIT.TagPairsMax) {
          pairs.push({ id: newId(), source: CLEANUP_SOURCE.Rule, tagIds: [keep, other] });
        }
      }
    }
    return pairs;
  }

  /** The mock model's synonym pairs, after the rule pairs; `ai-fail` refunds the run. */
  private tagSynonyms(known: readonly MockCleanupPair[], now: number): MockCleanupPair[] {
    const tags = this.usedTags();
    const names = tags.map((tag) => tag.name.toLowerCase());
    if (names.some((name) => name.includes(MOCK_TAG_SYNONYMS.FailMarker))) {
      this.countRun(now, -1);
      return [];
    }
    if (names.some((name) => name.includes(MOCK_TAG_SYNONYMS.RefuseMarker))) {
      return [];
    }
    const taken = new Set(known.flatMap((pair) => pair.tagIds));
    const pairs: MockCleanupPair[] = [];
    for (const set of MOCK_TAG_SYNONYMS.Sets) {
      const [keep, merge] = tags.filter((tag) =>
        (set as readonly string[]).includes(tag.name.toLowerCase()),
      );
      if (
        keep &&
        merge &&
        !taken.has(keep.id) &&
        !taken.has(merge.id) &&
        known.length + pairs.length < CLEANUP_LIMIT.TagPairsMax
      ) {
        pairs.push({ id: newId(), source: CLEANUP_SOURCE.Ai, tagIds: [keep.id, merge.id] });
      }
    }
    return pairs;
  }

  /** Stored groups read live: trashed members drop out, a group needs two live members. */
  private liveGroups(groups: readonly MockCleanupGroup[], now: number): CleanupDuplicateGroup[] {
    const liveFolder = (id: string) => this.library.folderList.some((folder) => folder.id === id);
    return groups.flatMap((group) => {
      const members = this.library.links.filter((link) => group.linkIds.includes(link.id));
      const choice = members.length < 2 ? null : pickKeep(members, liveFolder, now);
      if (!choice) {
        return [];
      }
      return [
        {
          id: group.id,
          reason: group.reason,
          source: group.source,
          keep: this.library.linkView(choice.keep),
          keepReason: choice.reason,
          copies: members
            .filter((link) => link.id !== choice.keep.id)
            .map((link) => this.library.linkView(link)),
        },
      ];
    });
  }

  /** Stored pairs read live: both tags must exist; the keep is the tag on more links. */
  private livePairs(pairs: readonly MockCleanupPair[]): CleanupTagPair[] {
    const tags = this.library.tagsView();
    const view = (tag: TagResponse): CleanupTag => ({
      id: tag.id,
      name: tag.name,
      links: tag.linkCount,
    });
    return pairs.flatMap((pair) => {
      const [first, second] = pair.tagIds.map((id) => tags.find((tag) => tag.id === id));
      if (!first || !second) {
        return [];
      }
      const [keep, merge] = second.linkCount > first.linkCount ? [second, first] : [first, second];
      return [{ id: pair.id, source: pair.source, keep: view(keep), merge: view(merge) }];
    });
  }

  /** Merges `source` into `target` like the tag merge, answering what Undo needs. */
  private merge(source: TagResponse, target: TagResponse): MockUndoMerge {
    const carrying = this.library.links.filter((link) => link.tags.includes(source.name));
    const added = carrying.filter((link) => !link.tags.includes(target.name));
    this.library.setTags(this.library.tagList.filter((tag) => tag.id !== source.id));
    this.library.retagLinks((name) => (name === source.name ? target.name : name));
    return {
      keptTagId: target.id,
      mergedName: source.name,
      linkIds: carrying.map((link) => link.id),
      addedLinkIds: added.map((link) => link.id),
    };
  }

  /** Puts a merged tag back on its links and takes the kept tag off the links that got it. */
  private unmerge(merge: MockUndoMerge): void {
    this.library.ensureTags([merge.mergedName]);
    const name =
      this.library.tagList.find((tag) => tag.name.toLowerCase() === merge.mergedName.toLowerCase())
        ?.name ?? merge.mergedName;
    const kept = this.library.tagList.find((tag) => tag.id === merge.keptTagId)?.name ?? null;
    const carrying = new Set(merge.linkIds);
    const added = new Set(merge.addedLinkIds);
    this.library.links = this.library.links.map((link) => {
      if (!carrying.has(link.id) && !added.has(link.id)) {
        return link;
      }
      const tags = link.tags.filter((tag) => !(added.has(link.id) && tag === kept));
      return {
        ...link,
        tags: normalizeLinkTags(carrying.has(link.id) ? [...tags, name] : tags),
      };
    });
  }
}
