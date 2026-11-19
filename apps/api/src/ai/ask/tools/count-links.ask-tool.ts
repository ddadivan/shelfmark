import { Injectable } from '@nestjs/common';
import { ASK_ACTIVITY, linkHost } from '@shelfmark/contracts';
import { toLinkKind } from '../../../links/to-link-kind';
import { loadFolderPaths } from '../../../mcp/tools/folder-tree';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';
import { ASK_GROUP_BY } from '../../models/ask-group-by.const';
import { ASK_TOOL_LIMIT } from '../../models/ask-tool-limit.const';
import { ASK_TOOL_NAME } from '../../models/ask-tool-name.const';
import { ASK_UNTRUSTED_CONTENT_NOTE } from '../../models/ask-untrusted-content-note.const';
import type { AskCountArgs } from '../../models/ask-count-args.interface';
import type { AskCountGroup } from '../../models/ask-count-group.interface';
import type { AskGroupBy } from '../../models/ask-group-by.type';
import type { AskParse } from '../../models/ask-parse.type';
import type { AskTool } from '../../models/ask-tool.interface';
import type { AskToolContext } from '../../models/ask-tool-context.interface';
import type { AskToolDefinition } from '../../models/ask-tool-definition.interface';
import type { AskToolOutcome } from '../../models/ask-tool-outcome.interface';
import { askLinkWhere, resolveAskFilters } from './ask-link-filters';
import { accept, argsObject, onlyKeys, refuse } from './ask-tool-args';
import { ASK_FILTER_KEYS, ASK_FILTER_SCHEMA, parseAskFilters } from './parse-ask-filters';

const KEYS = [...ASK_FILTER_KEYS, 'groupBy'] as const;
/** Label of the links without a folder. */
export const ASK_UNSORTED_LABEL = '(unsorted)';

function isGroupBy(value: unknown): value is AskGroupBy {
  return Object.values<unknown>(ASK_GROUP_BY).includes(value);
}

/** `count_links` arguments: the shared filters (none counts every link) and an optional `groupBy`. */
export function parseCountLinksArgs(input: unknown): AskParse<AskCountArgs> {
  const args = argsObject(input);
  if (args === null || !onlyKeys(args, KEYS)) return refuse('Unknown argument');
  const filters = parseAskFilters(args);
  if (!filters.ok) return filters;
  const groupBy = args['groupBy'];
  if (groupBy !== undefined && groupBy !== null && !isGroupBy(groupBy)) {
    return refuse(`groupBy must be one of ${Object.values(ASK_GROUP_BY).join(', ')}`);
  }
  return accept({ filters: filters.value, groupBy: isGroupBy(groupBy) ? groupBy : null });
}

/** Host without `www.`, lower case (the same rule as the stats). */
export function siteLabel(url: string): string {
  return (linkHost(url) ?? '').toLowerCase().replace(/^www\./u, '');
}

/** Counts per label, most first (ties by label), the top `GroupsMax` and the rest as `otherCount`. */
export function topGroups(labels: Iterable<string>): {
  groups: AskCountGroup[];
  otherCount: number;
} {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return topOf(counts);
}

function topOf(counts: ReadonlyMap<string, number>): {
  groups: AskCountGroup[];
  otherCount: number;
} {
  const sorted = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  const groups = sorted.slice(0, ASK_TOOL_LIMIT.GroupsMax);
  const otherCount = sorted
    .slice(ASK_TOOL_LIMIT.GroupsMax)
    .reduce((sum, group) => sum + group.count, 0);
  return { groups, otherCount };
}

/**
 * `count_links` (ADR 0055 point 2): exact counts of the session user's live links under the filters;
 * with a query, word matches only (meaning matches are not counted, the description says so).
 * `groupBy` folder (path), tag, kind through Prisma `groupBy`; site (host, `www.` dropped) and month
 * (UTC `YYYY-MM`) from the matching rows' URL and save time (at most `LINK_LIMIT.PerUserMax` rows,
 * so the filters stay one `where` shared with `search_links`). Top 20 groups plus `otherCount`.
 */
@Injectable()
export class CountLinksAskTool implements AskTool {
  readonly activity = ASK_ACTIVITY.Count;
  readonly definition: AskToolDefinition = {
    name: ASK_TOOL_NAME.CountLinks,
    description: `Count the user's saved links exactly, optionally under filters and grouped by folder, tag, site, kind or month (UTC). With a query only links containing every word are counted (links related only in meaning are not); say so when it matters. No filter counts every link. Returns total, the top 20 groups and otherCount. ${ASK_UNTRUSTED_CONTENT_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...ASK_FILTER_SCHEMA,
        groupBy: { type: 'string', enum: Object.values(ASK_GROUP_BY) },
      },
      additionalProperties: false,
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async call(context: AskToolContext, input: unknown): Promise<AskToolOutcome> {
    const parsed = parseCountLinksArgs(input);
    if (!parsed.ok) return { isError: true, data: parsed.message, found: null };
    const userId = context.user.id;
    const resolved = await resolveAskFilters(this.prisma, userId, parsed.value.filters);
    if (!resolved.ok) return { isError: true, data: resolved.message, found: null };
    const where = askLinkWhere(userId, resolved.value, {
      includeNotes: context.includeNotes,
      withWords: true,
    });
    const total = await this.prisma.link.count({ where });
    const groupBy = parsed.value.groupBy;
    if (groupBy === null) return { isError: false, data: { total }, found: total };
    const grouped = await this.groups(userId, where, groupBy);
    return { isError: false, data: { total, groupBy, ...grouped }, found: total };
  }

  private async groups(
    userId: string,
    where: Prisma.LinkWhereInput,
    groupBy: AskGroupBy,
  ): Promise<{ groups: AskCountGroup[]; otherCount: number }> {
    switch (groupBy) {
      case ASK_GROUP_BY.Folder: {
        const [rows, paths] = await Promise.all([
          this.prisma.link.groupBy({
            by: ['folderId'],
            where,
            _count: { _all: true },
            orderBy: { folderId: 'asc' },
          }),
          loadFolderPaths(this.prisma, userId),
        ]);
        const counts = new Map<string, number>();
        for (const row of rows) {
          const label =
            row.folderId === null
              ? ASK_UNSORTED_LABEL
              : (paths.get(row.folderId) ?? ASK_UNSORTED_LABEL);
          counts.set(label, (counts.get(label) ?? 0) + row._count._all);
        }
        return topOf(counts);
      }
      case ASK_GROUP_BY.Kind: {
        const rows = await this.prisma.link.groupBy({
          by: ['kind'],
          where,
          _count: { _all: true },
          orderBy: { kind: 'asc' },
        });
        const counts = new Map<string, number>();
        for (const row of rows) {
          const label = toLinkKind(row.kind);
          counts.set(label, (counts.get(label) ?? 0) + row._count._all);
        }
        return topOf(counts);
      }
      case ASK_GROUP_BY.Tag: {
        const rows = await this.prisma.linkTag.groupBy({
          by: ['tagId'],
          where: { link: where, tag: { userId } },
          _count: { _all: true },
          orderBy: { tagId: 'asc' },
        });
        const tags = await this.prisma.tag.findMany({
          where: { userId, id: { in: rows.map((row) => row.tagId) } },
          select: { id: true, name: true },
        });
        const names = new Map(tags.map((tag) => [tag.id, tag.name]));
        const counts = new Map<string, number>();
        for (const row of rows) {
          const name = names.get(row.tagId);
          if (name !== undefined) counts.set(name, row._count._all);
        }
        return topOf(counts);
      }
      case ASK_GROUP_BY.Site: {
        const rows = await this.prisma.link.findMany({ where, select: { url: true } });
        return topGroups(rows.map((row) => siteLabel(row.url)));
      }
      case ASK_GROUP_BY.Month: {
        const rows = await this.prisma.link.findMany({ where, select: { createdAt: true } });
        return topGroups(rows.map((row) => row.createdAt.toISOString().slice(0, 7)));
      }
    }
  }
}
