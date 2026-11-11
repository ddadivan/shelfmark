import { randomUUID } from 'node:crypto';
import { deriveLinkKind, normalizeTagName, normalizeUrl } from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { toLinkKind } from '../links/to-link-kind';
import type { DemoSeed } from './models/demo-seed.interface';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

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
  seed.links.forEach((link, order) => {
    const id = randomUUID();
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
    });
    for (const name of link.tags) {
      const tagId = tagIds.get(normalizeTagName(name));
      if (tagId === undefined) throw new Error(`Unknown seed tag: ${name}`);
      linkTags.push({ linkId: id, tagId });
    }
  });
  await tx.link.createMany({ data: linkRows });
  await tx.linkTag.createMany({ data: linkTags });
}
