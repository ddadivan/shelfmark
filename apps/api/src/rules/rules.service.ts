import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  findMatchingRule,
  hostMatchesDomain,
  LINK_LIMIT,
  RULE_ERROR_MESSAGE,
  RULE_LIMIT,
  ruleHost,
  type CreateRuleRequest,
  type ListRulesResponse,
  type RuleMatchesResponse,
  type RuleResponse,
  type UpdateRuleRequest,
} from '@shelfmark/contracts';
import { hasPrismaCode } from '../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../common/prisma/prisma-error-code.const';
import { escapeLike } from '../common/util/escape-like';
import type { Prisma } from '../generated/prisma/client';
import type { LinkDbClient } from '../links/models/link-db-client.type';
import { PrismaService } from '../prisma/prisma.service';
import { RULE_LOCK_PREFIX } from './models/rule-lock.const';
import type { RuleMatcher } from './models/rule-matcher.type';
import type { RuleRow } from './models/rule-row.interface';

const RULE_SELECT = {
  id: true,
  domain: true,
  folderId: true,
  tagNames: true,
  createdAt: true,
} as const;

/**
 * Domain rules (#398): at most `RULE_LIMIT.PerUserMax` per user, one per domain. Writes run under
 * the per-user `rules:` advisory lock (never taken with another lock), so the cap cannot be raced;
 * a target folder must be one of the user's live folders when it is written. `matcher` is what a
 * link save uses: it runs on the caller's transaction (after the `folders:` lock), so the folder
 * it answers is live at that moment.
 */
@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ListRulesResponse> {
    const rows = await this.prisma.linkRule.findMany({ where: { userId }, select: RULE_SELECT });
    // By code unit, not by the database collation: the web mock sorts the same way.
    rows.sort((a, b) => (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0));
    return { items: await this.respond(this.prisma, userId, rows) };
  }

  async create(userId: string, request: CreateRuleRequest): Promise<RuleResponse> {
    const folderId = request.folderId ?? null;
    const tags = request.tags ?? [];
    if (folderId === null && tags.length === 0) {
      throw new BadRequestException(RULE_ERROR_MESSAGE.NothingToDo);
    }
    return this.write(async (tx) => {
      if (folderId !== null) await this.requireFolder(tx, userId, folderId);
      const total = await tx.linkRule.count({ where: { userId } });
      if (total >= RULE_LIMIT.PerUserMax) {
        throw new ConflictException(RULE_ERROR_MESSAGE.LimitReached);
      }
      const row = await tx.linkRule.create({
        data: { userId, domain: request.domain, folderId, tagNames: [...tags] },
        select: RULE_SELECT,
      });
      return this.one(tx, userId, row);
    }, userId);
  }

  async update(userId: string, id: string, request: UpdateRuleRequest): Promise<RuleResponse> {
    return this.write(async (tx) => {
      const current = await tx.linkRule.findFirst({ where: { id, userId }, select: RULE_SELECT });
      if (!current) throw new NotFoundException(RULE_ERROR_MESSAGE.NotFound);
      const folderId = request.folderId === undefined ? current.folderId : request.folderId;
      const tags = request.tags ?? current.tagNames;
      if (folderId === null && tags.length === 0) {
        throw new BadRequestException(RULE_ERROR_MESSAGE.NothingToDo);
      }
      // A kept folder may be in Trash (the rule is flagged); only a newly chosen one is checked.
      if (folderId !== null && folderId !== current.folderId) {
        await this.requireFolder(tx, userId, folderId);
      }
      const row = await tx.linkRule.update({
        where: { id, userId },
        data: {
          ...(request.domain === undefined ? {} : { domain: request.domain }),
          ...(request.folderId === undefined ? {} : { folderId }),
          ...(request.tags === undefined ? {} : { tagNames: [...tags] }),
        },
        select: RULE_SELECT,
      });
      return this.one(tx, userId, row);
    }, userId);
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.linkRule.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException(RULE_ERROR_MESSAGE.NotFound);
  }

  /**
   * "Apply to existing links": the user's live links in Unsorted whose host matches the rule,
   * newest first; at most `LINK_LIMIT.BatchMax` are listed (one bulk update), `total` counts all.
   * The client moves and tags them with the bulk update and undoes it the same way.
   */
  async matches(userId: string, id: string): Promise<RuleMatchesResponse> {
    const rule = await this.prisma.linkRule.findFirst({
      where: { id, userId },
      select: { domain: true },
    });
    if (!rule) throw new NotFoundException(RULE_ERROR_MESSAGE.NotFound);
    // A plain domain must appear in the URL as typed; a punycode one may be stored in Unicode.
    const narrow = rule.domain.includes('xn--')
      ? {}
      : { url: { contains: escapeLike(rule.domain), mode: 'insensitive' as const } };
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, folderId: null, ...narrow },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, url: true, tags: { select: { tag: { select: { name: true } } } } },
    });
    const matching = rows.filter((row) => {
      const host = ruleHost(row.url);
      return host !== null && hostMatchesDomain(host, rule.domain);
    });
    return {
      total: matching.length,
      items: matching.slice(0, LINK_LIMIT.BatchMax).map((row) => ({
        id: row.id,
        tags: row.tags.map((entry) => entry.tag.name).sort((a, b) => a.localeCompare(b)),
      })),
    };
  }

  /**
   * The rules of the user as a matcher for links being saved: the most specific matching domain
   * wins; its folder only while it is one of the user's live folders (a trashed one is skipped,
   * the tags still apply). One read of the rules and one of their folders, whatever the number of
   * links.
   */
  async matcher(db: LinkDbClient, userId: string): Promise<RuleMatcher> {
    const rows = await db.linkRule.findMany({
      where: { userId },
      select: { domain: true, folderId: true, tagNames: true },
    });
    if (rows.length === 0) return () => null;
    const live = await this.liveFolders(db, userId, rows);
    const rules = rows.map((row) => ({
      domain: row.domain,
      folderId: row.folderId !== null && live.has(row.folderId) ? row.folderId : null,
      tags: row.tagNames,
    }));
    return (url) => {
      const rule = findMatchingRule(rules, url);
      return rule === null ? null : { folderId: rule.folderId, tags: [...rule.tags] };
    };
  }

  private async write<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    userId: string,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${RULE_LOCK_PREFIX + userId}, 0))`;
        return work(tx);
      });
    } catch (error) {
      if (hasPrismaCode(error, PRISMA_ERROR_CODE.UniqueViolation)) {
        throw new ConflictException(RULE_ERROR_MESSAGE.DomainTaken);
      }
      if (hasPrismaCode(error, PRISMA_ERROR_CODE.ForeignKeyViolation)) {
        // The folder was deleted for good between the check and the write.
        throw new NotFoundException(RULE_ERROR_MESSAGE.FolderNotFound);
      }
      throw error;
    }
  }

  /** A foreign, missing or trashed folder is 404, like everywhere else. */
  private async requireFolder(db: LinkDbClient, userId: string, folderId: string): Promise<void> {
    const found = await db.folder.findFirst({
      where: { id: folderId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(RULE_ERROR_MESSAGE.FolderNotFound);
  }

  private async liveFolders(
    db: LinkDbClient,
    userId: string,
    rows: readonly { folderId: string | null }[],
  ): Promise<Set<string>> {
    const ids = [...new Set(rows.flatMap((row) => (row.folderId === null ? [] : [row.folderId])))];
    if (ids.length === 0) return new Set();
    const folders = await db.folder.findMany({
      where: { userId, deletedAt: null, id: { in: ids } },
      select: { id: true },
    });
    return new Set(folders.map((folder) => folder.id));
  }

  private async one(db: LinkDbClient, userId: string, row: RuleRow): Promise<RuleResponse> {
    const [item] = await this.respond(db, userId, [row]);
    if (item === undefined) throw new NotFoundException(RULE_ERROR_MESSAGE.NotFound);
    return item;
  }

  private async respond(
    db: LinkDbClient,
    userId: string,
    rows: readonly RuleRow[],
  ): Promise<RuleResponse[]> {
    const live = await this.liveFolders(db, userId, rows);
    return rows.map((row) => ({
      id: row.id,
      domain: row.domain,
      folderId: row.folderId,
      folderAvailable: row.folderId === null || live.has(row.folderId),
      tags: [...row.tagNames],
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
