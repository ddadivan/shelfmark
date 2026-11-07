import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeTagName, TAG_LIMIT } from '@shelfmark/contracts';
import type { ListTagsResponse, TagResponse } from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';
import type { TagDbClient } from './models/tag-db-client.type';
import type { TagWithCount } from './models/tag-with-count.interface';

const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && Reflect.get(error, 'code') === UNIQUE_VIOLATION
  );
}

function toResponse(tag: TagWithCount): TagResponse {
  return {
    id: tag.id,
    name: tag.name,
    linkCount: tag._count.links,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}

/** The columns of a tag with the number of the owner's links. */
function tagSelect(userId: string) {
  return {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { links: { where: { link: { userId } } } } },
  } as const;
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ListTagsResponse> {
    const tags = await this.prisma.tag.findMany({ where: { userId }, select: tagSelect(userId) });
    const items = tags
      .map(toResponse)
      .sort((a, b) => b.linkCount - a.linkCount || a.name.localeCompare(b.name, 'en'));
    return { items };
  }

  get(userId: string, id: string): Promise<TagResponse> {
    return this.read(this.prisma, userId, id);
  }

  async create(userId: string, name: string): Promise<TagResponse> {
    const count = await this.prisma.tag.count({ where: { userId } });
    if (count >= TAG_LIMIT.PerUserMax) throw new ConflictException('Tag limit reached');
    try {
      const tag = await this.prisma.tag.create({
        data: { userId, name },
        select: tagSelect(userId),
      });
      return toResponse(tag);
    } catch (error) {
      throw this.conflictOr(error);
    }
  }

  async rename(userId: string, id: string, name: string): Promise<TagResponse> {
    await this.read(this.prisma, userId, id);
    try {
      // The unique index is on lower(name) per user, so a case-only change of the tag's own name
      // never collides with itself.
      const result = await this.prisma.tag.updateMany({ where: { id, userId }, data: { name } });
      if (result.count === 0) throw new NotFoundException('Tag not found');
    } catch (error) {
      throw this.conflictOr(error);
    }
    return this.read(this.prisma, userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    // The tag's link rows go with it (cascade); the links themselves stay.
    const result = await this.prisma.tag.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Tag not found');
  }

  /** Moves the links of `sourceId` onto `targetId` and deletes the source, in one transaction. */
  merge(userId: string, sourceId: string, targetId: string): Promise<TagResponse> {
    return this.prisma.$transaction(async (tx) => {
      // Both lookups come first: a foreign or missing tag is a 404 even when the ids are equal.
      await this.read(tx, userId, sourceId);
      await this.read(tx, userId, targetId);
      if (sourceId === targetId) throw new BadRequestException('Cannot merge a tag into itself');
      const moved = await tx.linkTag.findMany({
        where: { tagId: sourceId, link: { userId } },
        select: { linkId: true },
      });
      await tx.linkTag.createMany({
        data: moved.map(({ linkId }) => ({ linkId, tagId: targetId })),
        skipDuplicates: true,
      });
      await tx.tag.delete({ where: { id: sourceId } });
      return this.read(tx, userId, targetId);
    });
  }

  /**
   * Finds or creates the user's tags for these names and returns their ids in input order. Names
   * are normalized and de-duplicated case-insensitively (the first spelling wins); blank names are
   * skipped. Runs on the caller's transaction so a link write and its tags commit together.
   */
  async resolveNames(userId: string, names: readonly string[], tx: TagDbClient): Promise<string[]> {
    const wanted = new Map<string, string>();
    for (const raw of names) {
      const name = normalizeTagName(raw);
      if (name === '') continue;
      if (name.length > TAG_LIMIT.NameMax) throw new BadRequestException('Tag name is too long');
      const key = name.toLowerCase();
      if (!wanted.has(key)) wanted.set(key, name);
    }
    if (wanted.size === 0) return [];

    let all = await tx.tag.findMany({ where: { userId }, select: { id: true, name: true } });
    const known = new Set(all.map((tag) => tag.name.toLowerCase()));
    const missing = [...wanted.entries()].filter(([key]) => !known.has(key));
    if (missing.length > 0) {
      if (all.length + missing.length > TAG_LIMIT.PerUserMax) {
        throw new ConflictException('Tag limit reached');
      }
      // ON CONFLICT DO NOTHING: a concurrent request creating the same name is not an error.
      await tx.tag.createMany({
        data: missing.map(([, name]) => ({ userId, name })),
        skipDuplicates: true,
      });
      all = await tx.tag.findMany({ where: { userId }, select: { id: true, name: true } });
    }
    const idByKey = new Map(all.map((tag) => [tag.name.toLowerCase(), tag.id]));
    return [...wanted.keys()].flatMap((key) => idByKey.get(key) ?? []);
  }

  private async read(db: TagDbClient, userId: string, id: string): Promise<TagResponse> {
    const tag = await db.tag.findFirst({ where: { id, userId }, select: tagSelect(userId) });
    if (!tag) throw new NotFoundException('Tag not found');
    return toResponse(tag);
  }

  private conflictOr(error: unknown): unknown {
    return isUniqueViolation(error)
      ? new ConflictException('A tag with this name already exists')
      : error;
  }
}
