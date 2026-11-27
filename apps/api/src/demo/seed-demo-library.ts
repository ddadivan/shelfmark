import { randomUUID } from 'node:crypto';
import {
  AI_JOB_STATUS,
  normalizeTagName,
  SUGGESTION_KIND,
  SUMMARY_SOURCE,
} from '@shelfmark/contracts';
import { AI_SETTINGS_DEFAULT } from '../ai/models/ai-settings-default.const';
import { SUGGESTION_ROW_STATE } from '../ai/models/suggestion-row-state.const';
import type { Prisma } from '../generated/prisma/client';
import { toLinkKind } from '../links/to-link-kind';
import type { DemoSeed } from './models/demo-seed.interface';
import { seedDemoEmbeddings } from './seed-demo-embeddings';
import { buildLinkDerivedColumns } from '../links/build-link-derived-columns';

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
 * some unsorted links, the same as the web mock's demo seed, and a mock vector per link for search by
 * meaning (AI-3). Every row cascades with the user.
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
  const embedded: Parameters<typeof seedDemoEmbeddings>[2][number][] = [];
  seed.links.forEach((link, order) => {
    const id = randomUUID();
    embedded.push({
      id,
      title: link.title,
      tagNames: link.tags.map(normalizeTagName),
      summary: link.summary ?? null,
      note: link.note ?? null,
    });
    const suggested = seedSuggestions(link.suggestFolder, link.suggestTags ?? []).map(
      (suggestion) => ({ ...suggestion, userId, linkId: id }),
    );
    suggestions.push(...suggested);
    linkRows.push({
      id,
      userId,
      folderId: link.folder === null ? null : idOfFolder(link.folder),
      url: link.url,
      title: link.title,
      ...buildLinkDerivedColumns(link.url, link.title, {
        kind: link.kind === undefined ? undefined : toLinkKind(link.kind),
      }),
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
  // Search by meaning is on for the sandbox (the default) and ready from the first search.
  await seedDemoEmbeddings(tx, userId, embedded, AI_SETTINGS_DEFAULT.includeNotes);
  await tx.linkRule.createMany({
    data: seed.rules.map((rule) => ({
      userId,
      domain: rule.domain,
      folderId: rule.folder === null ? null : idOfFolder(rule.folder),
      tagNames: rule.tags.map(normalizeTagName),
    })),
  });
  await tx.aiSettings.create({
    data: { userId, ...AI_SETTINGS_DEFAULT, enabled: true, enabledAt: now, introSeenAt: now },
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
