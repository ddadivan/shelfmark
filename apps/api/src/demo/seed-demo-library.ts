import { randomUUID } from 'node:crypto';
import {
  AI_JOB_STATUS,
  deriveLinkKind,
  normalizeTagName,
  normalizeUrl,
  SUGGESTION_KIND,
  SUMMARY_SOURCE,
} from '@shelfmark/contracts';
import { AI_SETTINGS_DEFAULT } from '../ai/models/ai-settings-default.const';
import { SUGGESTION_ROW_STATE } from '../ai/models/suggestion-row-state.const';
import type { Prisma } from '../generated/prisma/client';
import { toLinkKind } from '../links/to-link-kind';
import type { DemoSeed } from './models/demo-seed.interface';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

function daysAgo(now: Date, days: number, order: number): Date {
  // The index keeps the timestamps distinct, so ordering by date is stable.
  return new Date(now.getTime() - days * MS_PER_DAY - order * MS_PER_MINUTE);
}

/**
 * Inserts the seed library for one new demo user inside the caller's transaction: a handful of bulk
 * statements, no per-row round trips. Ids are generated here so links, folders and tags can refer
 * to each other without reading anything back. Tag names go through the shared normalizer, so the
 * seed behaves like tags typed by a user. The seed is trusted, repository-owned data: it is never
 * fetched and never comes from a request.
 *
 * The sandbox starts with AI on (#389): an `ai_settings` row with the default modes, the intro
 * already seen, AI summaries (source `ai`, status `done`) on most links and pending suggestions on
 * some unsorted links, the same as the web mock's demo seed. Every row cascades with the user.
 */
export async function seedDemoLibrary(
  tx: Prisma.TransactionClient,
  userId: string,
  seed: DemoSeed,
  now: Date,
): Promise<void> {
  const folderIds = new Map(seed.folders.map((folder) => [folder.key, randomUUID()]));
  const idOfFolder = (key: string): string => {
    const id = folderIds.get(key);
    if (id === undefined) throw new Error(`Unknown seed folder: ${key}`);
    return id;
  };

  // Parents before children: one statement per depth, so the (parent, user) key always exists.
  const created = new Set<string>();
  let pending = seed.folders;
  while (pending.length > 0) {
    const ready = pending.filter((folder) => folder.parent === null || created.has(folder.parent));
    if (ready.length === 0) throw new Error('The seed folders contain a cycle or a missing parent');
    await tx.folder.createMany({
      data: ready.map((folder) => ({
        id: idOfFolder(folder.key),
        userId,
        name: folder.name,
        parentId: folder.parent === null ? null : idOfFolder(folder.parent),
        colour: folder.colour,
        highlighted: folder.highlighted ?? false,
      })),
    });
    for (const folder of ready) created.add(folder.key);
    pending = pending.filter((folder) => !created.has(folder.key));
  }

  const tagIds = new Map(seed.tags.map((name) => [normalizeTagName(name), randomUUID()]));
  await tx.tag.createMany({
    data: [...tagIds].map(([name, id]) => ({ id, userId, name })),
  });

  const linkRows: Prisma.LinkCreateManyInput[] = [];
  const linkTags: Prisma.LinkTagCreateManyInput[] = [];
  const suggestions: Prisma.LinkSuggestionCreateManyInput[] = [];
  seed.links.forEach((link, order) => {
    const id = randomUUID();
    const suggested = seedSuggestions(link.suggestFolder, link.suggestTags ?? []).map(
      (suggestion) => ({ ...suggestion, userId, linkId: id }),
    );
    suggestions.push(...suggested);
    linkRows.push({
      id,
      userId,
      folderId: link.folder === null ? null : idOfFolder(link.folder),
      url: link.url,
      normalizedUrl: normalizeUrl(link.url),
      title: link.title,
      titleSortKey: link.title.toLowerCase(),
      kind: link.kind === undefined ? deriveLinkKind(link.url) : toLinkKind(link.kind),
      note: link.note ?? null,
      isFavorite: link.isFavorite,
      createdAt: daysAgo(now, link.createdDaysAgo, order),
      lastOpenedAt:
        link.lastOpenedDaysAgo === null ? null : daysAgo(now, link.lastOpenedDaysAgo, order),
      remindAt:
        link.remindInHours === undefined
          ? null
          : new Date(now.getTime() + link.remindInHours * MS_PER_HOUR),
      summary: link.summary ?? null,
      summarySource: link.summary === undefined ? null : SUMMARY_SOURCE.Ai,
      aiStatus: link.summary === undefined && suggested.length === 0 ? null : AI_JOB_STATUS.Done,
    });
    for (const name of link.tags) {
      const tagId = tagIds.get(normalizeTagName(name));
      if (tagId === undefined) throw new Error(`Unknown seed tag: ${name}`);
      linkTags.push({ linkId: id, tagId });
    }
  });
  await tx.link.createMany({ data: linkRows });
  await tx.linkTag.createMany({ data: linkTags });
  await tx.linkSuggestion.createMany({ data: suggestions });
  await tx.linkRule.createMany({
    data: seed.rules.map((rule) => ({
      userId,
      domain: rule.domain,
      folderId: rule.folder === null ? null : idOfFolder(rule.folder),
      tagNames: rule.tags.map(normalizeTagName),
    })),
  });
  // `meaningSearch` has no column until the AI-3 migration.
  const { meaningSearch: _meaningSearch, ...aiDefaults } = AI_SETTINGS_DEFAULT;
  await tx.aiSettings.create({
    data: { userId, ...aiDefaults, enabled: true, enabledAt: now, introSeenAt: now },
  });

  /** The pending suggestions of one link: the folder first, then tags (a name not in the seed is new). */
  function seedSuggestions(
    folder: string | undefined,
    tags: readonly string[],
  ): Omit<Prisma.LinkSuggestionCreateManyInput, 'userId' | 'linkId'>[] {
    const rows: Omit<Prisma.LinkSuggestionCreateManyInput, 'userId' | 'linkId'>[] = [];
    if (folder !== undefined) {
      rows.push({
        kind: SUGGESTION_KIND.Folder,
        folderId: idOfFolder(folder),
        tagName: null,
        state: SUGGESTION_ROW_STATE.Suggested,
      });
    }
    for (const name of tags) {
      const tagName = normalizeTagName(name);
      rows.push({
        kind: tagIds.has(tagName) ? SUGGESTION_KIND.Tag : SUGGESTION_KIND.NewTag,
        folderId: null,
        tagName,
        state: SUGGESTION_ROW_STATE.Suggested,
      });
    }
    return rows;
  }
}
