import { Inject, Injectable } from '@nestjs/common';
import { MCP_LIMIT, TAG_LIMIT, normalizeTagName } from '@shelfmark/contracts';
import { hasControlChars } from '../../common/validation/has-control-chars';
import { buildLinkWhere } from '../../links/link-where';
import { PrismaService } from '../../prisma/prisma.service';
import { MCP_LINK_SCHEMA } from '../models/mcp-link-schema.const';
import { MCP_LINK_SELECT } from '../models/mcp-link-select.const';
import type { McpLinkRow } from '../models/mcp-link-row.type';
import type { McpMeaningSearch } from '../models/mcp-meaning-search.interface';
import { MCP_MEANING_SEARCH } from '../models/mcp-meaning-search.token';
import type { McpParseResult } from '../models/mcp-parse-result.type';
import type { McpPrincipal } from '../models/mcp-principal.interface';
import { MCP_READ_ONLY_ANNOTATIONS } from '../models/mcp-read-only-annotations.const';
import type { McpSearchItem } from '../models/mcp-search-item.interface';
import { MCP_SEARCH_MATCH } from '../models/mcp-search-match.const';
import type { McpTool } from '../models/mcp-tool.interface';
import { MCP_TOOL_CALL_KIND } from '../models/mcp-tool-call-kind.const';
import type { McpToolDefinition } from '../models/mcp-tool-definition.interface';
import { MCP_TOOL_NAME } from '../models/mcp-tool-name.const';
import type { McpToolOutcome } from '../models/mcp-tool-outcome.type';
import { MCP_UNTRUSTED_CONTENT_NOTE } from '../models/mcp-untrusted-content-note.const';
import type { SearchLinksArgs } from '../models/search-links-args.interface';
import { toMcpLink } from '../to-mcp-link';
import { loadFolderPaths } from './folder-tree';
import { hasOnlyKeys, invalidArgs, isUuid, validArgs } from './tool-args';

const KEYS = ['query', 'folderId', 'tag', 'limit'] as const;

/**
 * `search_links`: the user's live links whose title, note or URL contain every word of the query
 * (`buildLinkWhere`, the same search as the app), newest first, optionally inside one folder (its
 * direct links) or with one tag. A foreign or missing folder simply matches nothing. When word
 * matches leave room, the AI-3 meaning search (`MCP_MEANING_SEARCH`, a no-op on this branch) fills
 * the remaining slots, each result marked with how it matched.
 */
@Injectable()
export class SearchLinksTool implements McpTool<SearchLinksArgs> {
  readonly definition: McpToolDefinition = {
    name: MCP_TOOL_NAME.SearchLinks,
    title: 'Search links',
    description: `Search the user's saved links. Every word of the query must appear in the title, note or URL; newest first. Optionally only the links directly in one folder (id from list_folders) or with one tag (from list_tags). ${MCP_UNTRUSTED_CONTENT_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: MCP_LIMIT.QueryMax },
        folderId: {
          type: 'string',
          format: 'uuid',
          description: 'Only links directly in this folder',
        },
        tag: { type: 'string', minLength: 1, maxLength: TAG_LIMIT.NameMax },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: MCP_LIMIT.SearchLimitMax,
          default: MCP_LIMIT.SearchLimitDefault,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            ...MCP_LINK_SCHEMA,
            properties: {
              ...MCP_LINK_SCHEMA.properties,
              match: { type: 'string', enum: Object.values(MCP_SEARCH_MATCH) },
            },
            required: [...MCP_LINK_SCHEMA.required, 'match'],
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
    annotations: MCP_READ_ONLY_ANNOTATIONS,
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MCP_MEANING_SEARCH) private readonly meaning: McpMeaningSearch,
  ) {}

  parse(args: Record<string, unknown>): McpParseResult<SearchLinksArgs> {
    if (!hasOnlyKeys(args, KEYS)) return invalidArgs('Unknown argument');
    const { query, folderId, tag, limit } = args;
    if (typeof query !== 'string') return invalidArgs('query must be a string');
    const trimmed = query.trim();
    if (trimmed.length === 0 || trimmed.length > MCP_LIMIT.QueryMax || hasControlChars(trimmed)) {
      return invalidArgs(`query must be 1 to ${MCP_LIMIT.QueryMax} characters of text`);
    }
    if (folderId !== undefined && !isUuid(folderId)) return invalidArgs('folderId must be a UUID');
    let tagName: string | undefined;
    if (tag !== undefined) {
      tagName = typeof tag === 'string' ? normalizeTagName(tag) : '';
      if (tagName.length === 0 || tagName.length > TAG_LIMIT.NameMax || hasControlChars(tagName)) {
        return invalidArgs(`tag must be 1 to ${TAG_LIMIT.NameMax} characters`);
      }
    }
    const count = limit ?? MCP_LIMIT.SearchLimitDefault;
    if (
      typeof count !== 'number' ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > MCP_LIMIT.SearchLimitMax
    ) {
      return invalidArgs(`limit must be an integer from 1 to ${MCP_LIMIT.SearchLimitMax}`);
    }
    return validArgs({
      query: trimmed,
      limit: count,
      ...(folderId === undefined ? {} : { folderId }),
      ...(tagName === undefined ? {} : { tag: tagName }),
    });
  }

  async run(principal: McpPrincipal, args: SearchLinksArgs): Promise<McpToolOutcome> {
    const { userId } = principal;
    const filter = {
      folderId: args.folderId,
      tag: args.tag === undefined ? undefined : [args.tag],
    };
    const words = await this.prisma.link.findMany({
      where: buildLinkWhere(userId, { ...filter, q: args.query }),
      select: MCP_LINK_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: args.limit,
    });
    const meaning = await this.meaningMatches(userId, args, words);
    const paths = await loadFolderPaths(this.prisma, userId);
    const item = (row: McpLinkRow, match: McpSearchItem['match']): McpSearchItem => ({
      ...toMcpLink(row, paths, principal.includeNotes),
      match,
    });
    const items = [
      ...words.map((row) => item(row, MCP_SEARCH_MATCH.Words)),
      ...meaning.map((row) => item(row, MCP_SEARCH_MATCH.Meaning)),
    ];
    return { kind: MCP_TOOL_CALL_KIND.Ok, structured: { items }, count: items.length };
  }

  /** Meaning matches for the slots the word matches left, in the order the search ranked them. */
  private async meaningMatches(
    userId: string,
    args: SearchLinksArgs,
    words: readonly McpLinkRow[],
  ): Promise<McpLinkRow[]> {
    const room = args.limit - words.length;
    if (room <= 0) return [];
    const ids = await this.meaning.find(userId, {
      query: args.query,
      folderId: args.folderId,
      tag: args.tag,
      excludeIds: words.map((row) => row.id),
      limit: room,
    });
    const wanted = ids.filter((id) => !words.some((row) => row.id === id)).slice(0, room);
    if (wanted.length === 0) return [];
    // The same user, live and filter conditions as the word search: the seam can never widen them.
    const rows = await this.prisma.link.findMany({
      where: {
        AND: [
          buildLinkWhere(userId, {
            folderId: args.folderId,
            tag: args.tag === undefined ? undefined : [args.tag],
          }),
          { id: { in: wanted } },
        ],
      },
      select: MCP_LINK_SELECT,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return wanted.flatMap((id) => byId.get(id) ?? []);
  }
}
