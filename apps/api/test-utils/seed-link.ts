import { normalizeUrl } from '@shelfmark/contracts';
import { escapeLike } from '../src/common/util/escape-like';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { SeedLinkOptions } from './models/seed-link-options.interface';

let counter = 0;

/** Inserts a link straight into the database (bulk fixtures; the API is rate limited). Returns its id. */
export async function seedLink(
  prisma: PrismaService,
  userId: string,
  options: SeedLinkOptions = {},
): Promise<string> {
  counter += 1;
  const title = options.title ?? `Link ${counter}`;
  const url = options.url ?? `https://example.test/seed/${counter}`;
  const tagIds: string[] = [];
  for (const name of options.tags ?? []) {
    const existing = await prisma.tag.findFirst({
      where: { userId, name: { equals: escapeLike(name), mode: 'insensitive' } },
      select: { id: true },
    });
    const id = existing?.id ?? (await prisma.tag.create({ data: { userId, name } })).id;
    tagIds.push(id);
  }
  const link = await prisma.link.create({
    data: {
      userId,
      url,
      normalizedUrl: normalizeUrl(url),
      title,
      titleSortKey: title.toLowerCase(),
      note: options.note ?? null,
      folderId: options.folderId ?? null,
      isFavorite: options.isFavorite ?? false,
      lastOpenedAt: options.lastOpenedAt ?? null,
      idempotencyKey: options.idempotencyKey ?? null,
      ...(options.createdAt === undefined ? {} : { createdAt: options.createdAt }),
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    select: { id: true },
  });
  return link.id;
}
