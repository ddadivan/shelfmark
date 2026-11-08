import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { normalizeTagName, TAG_LIMIT } from '@shelfmark/contracts';
import type { ListTagsResponse, TagResponse } from '@shelfmark/contracts';
import { escapeLike } from '../common/util/escape-like';
import { hasPrismaCode } from '../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../common/prisma/prisma-error-code.const';
import { PrismaService } from '../prisma/prisma.service';
import { TAG_ERROR_MESSAGE } from './models/tag-error-message.const';
import { TAG_LOCK_PREFIX } from './models/tag-advisory-lock.const';
import type { TagDbClient } from './models/tag-db-client.type';
import type { TagWithCount } from './models/tag-with-count.interface';

function isUniqueViolation(error: unknown): boolean {
  return hasPrismaCode(error, PRISMA_ERROR_CODE.UniqueViolation);
}

/** A tag deleted by a concurrent request: a foreign key failure or a missing record. */
function isVanishedRecord(error: unknown): boolean {
  return (
    hasPrismaCode(error, PRISMA_ERROR_CODE.ForeignKeyViolation) ||
    hasPrismaCode(error, PRISMA_ERROR_CODE.RecordNotFound)
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
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockUserTags(tx, userId);
        const count = await tx.tag.count({ where: { userId } });
        if (count >= TAG_LIMIT.PerUserMax)
          throw new ConflictException(TAG_ERROR_MESSAGE.LimitReached);
        const tag = await tx.tag.create({ data: { userId, name }, select: tagSelect(userId) });
        return toResponse(tag);
      });
    } catch (error) {
      throw this.conflictOr(error);
    }
  }

  async rename(userId: string, id: string, name: string): Promise<TagResponse> {
    try {
      // The unique index is on lower(name) per user, so a case-only change of the tag's own name
      // never collides with itself.
      const result = await this.prisma.tag.updateMany({ where: { id, userId }, data: { name } });
      if (result.count === 0) throw new NotFoundException(TAG_ERROR_MESSAGE.NotFound);
    } catch (error) {
      throw this.conflictOr(error);
    }
    return this.read(this.prisma, userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    // The tag's link rows go with it (cascade); the links themselves stay.
    const result = await this.prisma.tag.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException(TAG_ERROR_MESSAGE.NotFound);
  }

  /** Moves the links of `sourceId` onto `targetId` and deletes the source, in one transaction. */
  async merge(userId: string, sourceId: string, targetId: string): Promise<TagResponse> {
    try {
      return await this.mergeInTransaction(userId, sourceId, targetId);
    } catch (error) {
      // A concurrent delete of the target between the lookup and the insert: the target is gone.
      if (isVanishedRecord(error)) throw new NotFoundException(TAG_ERROR_MESSAGE.NotFound);
      throw error;
    }
  }

  private mergeInTransaction(
    userId: string,
    sourceId: string,
    targetId: string,
  ): Promise<TagResponse> {
    return this.prisma.$transaction(async (tx) => {
      // Same lock as create and resolveNames: opposite merges and tag creation run one at a time.
      await this.lockUserTags(tx, userId);
      // Both lookups come first: a foreign or missing tag is a 404 even when the ids are equal.
      await this.read(tx, userId, sourceId);
      await this.read(tx, userId, targetId);
      if (sourceId === targetId) throw new BadRequestException(TAG_ERROR_MESSAGE.MergeIntoItself);
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
      if (name.length > TAG_LIMIT.NameMax)
        throw new BadRequestException(TAG_ERROR_MESSAGE.NameTooLong);
      const key = name.toLowerCase();
      if (!wanted.has(key)) wanted.set(key, name);
    }
    if (wanted.size === 0) return [];

    await this.lockUserTags(tx, userId);
    const ids = new Map<string, string>();
    const missing: string[] = [];
    for (const [key, name] of wanted) {
      const id = await this.findIdByName(tx, userId, name);
      if (id === undefined) missing.push(name);
      else ids.set(key, id);
    }
    if (missing.length > 0) {
      const count = await tx.tag.count({ where: { userId } });
      if (count + missing.length > TAG_LIMIT.PerUserMax) {
        throw new ConflictException(TAG_ERROR_MESSAGE.LimitReached);
      }
      // ON CONFLICT DO NOTHING: a concurrent request creating the same name is not an error.
      await tx.tag.createMany({
        data: missing.map((name) => ({ userId, name })),
        skipDuplicates: true,
      });
      for (const name of missing) {
        const id = await this.findIdByName(tx, userId, name);
        // Never drop a requested name silently.
        if (id === undefined) throw new InternalServerErrorException();
        ids.set(name.toLowerCase(), id);
      }
    }
    const resolved = new Set<string>();
    for (const key of wanted.keys()) {
      const id = ids.get(key);
      if (id === undefined) throw new InternalServerErrorException();
      resolved.add(id);
    }
    return [...resolved];
  }

  /** Matches in the database (`mode: 'insensitive'`), like the unique index, not in JavaScript. */
  private async findIdByName(
    db: TagDbClient,
    userId: string,
    name: string,
  ): Promise<string | undefined> {
    const tag = await db.tag.findFirst({
      where: { userId, name: { equals: escapeLike(name), mode: 'insensitive' } },
      select: { id: true },
    });
    return tag?.id;
  }

  /**
   * Serializes tag creation per user until the transaction ends, so the count-then-insert cap
   * check cannot be raced. The key is namespaced, so it never blocks the folders lock.
   */
  async lockUserTags(db: TagDbClient, userId: string): Promise<void> {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${TAG_LOCK_PREFIX + userId}, 0))`;
  }

  private async read(db: TagDbClient, userId: string, id: string): Promise<TagResponse> {
    const tag = await db.tag.findFirst({ where: { id, userId }, select: tagSelect(userId) });
    if (!tag) throw new NotFoundException(TAG_ERROR_MESSAGE.NotFound);
    return toResponse(tag);
  }

  private conflictOr(error: unknown): unknown {
    return isUniqueViolation(error) ? new ConflictException(TAG_ERROR_MESSAGE.NameTaken) : error;
  }
}
