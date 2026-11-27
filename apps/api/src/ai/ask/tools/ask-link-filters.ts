import type { AskSearchFilter } from '@shelfmark/contracts';
import { searchTerms } from '@shelfmark/contracts';
import { escapeLike } from '../../../common/util/escape-like';
import type { Prisma } from '../../../generated/prisma/client';
import { buildLinkWhere } from '../../../links/link-where';
import { buildFolderTree, loadFolderRows } from '../../../mcp/tools/folder-tree';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { AskFilters } from '../../models/ask-filters.interface';
import type { AskParse } from '../../models/ask-parse.type';
import type { AskResolvedFilters } from '../../models/ask-resolved-filters.interface';
import { accept, refuse } from './ask-tool-args';

const DAY_MS = 86_400_000;

function folderKey(path: string): string {
  return path
    .split('/')
    .map((part) => part.trim().toLowerCase())
    .join('/');
}

/** A live folder of the user by its path, or by its name when only one folder has it. */
async function resolveFolder(
  prisma: PrismaService,
  userId: string,
  wanted: string,
): Promise<string | null> {
  const nodes = buildFolderTree(await loadFolderRows(prisma, userId));
  const key = folderKey(wanted);
  const byPath = nodes.find((node) => folderKey(node.path) === key);
  if (byPath !== undefined) return byPath.id;
  const byName = nodes.filter((node) => node.name.trim().toLowerCase() === key);
  return byName.length === 1 ? (byName[0]?.id ?? null) : null;
}

/**
 * Resolves folder and tag names on the session user's own rows (a name that exists only for another
 * user resolves to nothing) and turns the UTC days into bounds. An unknown folder or tag is an
 * `is_error` result, so the model can look them up and correct itself.
 */
export async function resolveAskFilters(
  prisma: PrismaService,
  userId: string,
  filters: AskFilters,
): Promise<AskParse<AskResolvedFilters>> {
  let folderId: string | null = null;
  if (filters.folder !== null) {
    folderId = await resolveFolder(prisma, userId, filters.folder);
    if (folderId === null) return refuse('No folder with this path; call list_folders');
  }
  let tag: string | null = null;
  if (filters.tag !== null) {
    const row = await prisma.tag.findFirst({
      where: { userId, name: { equals: escapeLike(filters.tag), mode: 'insensitive' } },
      select: { name: true },
    });
    if (row === null) return refuse('No tag with this name; call list_tags');
    tag = row.name;
  }
  return accept({
    query: filters.query,
    folderId,
    tag,
    kind: filters.kind,
    site: filters.site,
    from: filters.savedFrom === null ? null : new Date(`${filters.savedFrom}T00:00:00Z`),
    until:
      filters.savedTo === null
        ? null
        : new Date(new Date(`${filters.savedTo}T00:00:00Z`).getTime() + DAY_MS),
    favorite: filters.favorite,
  });
}

/** The URL prefixes of one host (http and https, with or without `www.`), each ending the host. */
function siteCondition(site: string): Prisma.LinkWhereInput {
  const or: Prisma.LinkWhereInput[] = [];
  for (const scheme of ['https', 'http']) {
    for (const www of ['', 'www.']) {
      const base = `${scheme}://${www}${site}`;
      or.push({ url: { equals: base, mode: 'insensitive' } });
      for (const end of ['/', '?', '#', ':']) {
        or.push({ url: { startsWith: escapeLike(`${base}${end}`), mode: 'insensitive' } });
      }
    }
  }
  return { OR: or };
}

/** Every word in the title, URL, summary, a tag name or (with the switch) the note. */
function wordsCondition(
  userId: string,
  query: string,
  includeNotes: boolean,
): Prisma.LinkWhereInput[] {
  return searchTerms(query).map((term) => {
    const escaped = escapeLike(term);
    return {
      OR: [
        { title: { contains: escaped, mode: 'insensitive' } },
        { url: { contains: escaped, mode: 'insensitive' } },
        { summary: { contains: escaped, mode: 'insensitive' } },
        ...(includeNotes ? [{ note: { contains: escaped, mode: 'insensitive' as const } }] : []),
        { tags: { some: { tag: { userId, name: { contains: escaped, mode: 'insensitive' } } } } },
      ],
    };
  });
}

/**
 * The `where` of an Ask tool query: always the session user's live links (`buildLinkWhere` first),
 * then the resolved filters; the words only when `withWords` (meaning matches use the filters alone).
 */
export function askLinkWhere(
  userId: string,
  filters: AskResolvedFilters,
  options: { includeNotes: boolean; withWords: boolean },
): Prisma.LinkWhereInput {
  const and: Prisma.LinkWhereInput[] = [
    buildLinkWhere(userId, {
      folderId: filters.folderId ?? undefined,
      tag: filters.tag === null ? undefined : [filters.tag],
      kind: filters.kind ?? undefined,
      favorite: filters.favorite ?? undefined,
    }),
  ];
  if (filters.site !== null) and.push(siteCondition(filters.site));
  if (filters.from !== null) and.push({ createdAt: { gte: filters.from } });
  if (filters.until !== null) and.push({ createdAt: { lt: filters.until } });
  if (options.withWords && filters.query !== null) {
    and.push(...wordsCondition(userId, filters.query, options.includeNotes));
  }
  return { userId, deletedAt: null, AND: and };
}

/**
 * The search the links feed can show again (words, folder, tag, kind, favourites), or `null` when
 * the search also used a site or a date, which the feed has no filter for.
 */
export function toAskSearchFilter(filters: AskResolvedFilters): AskSearchFilter | null {
  if (filters.site !== null || filters.from !== null || filters.until !== null) return null;
  if (filters.favorite === false) return null;
  return {
    q: filters.query,
    folderId: filters.folderId,
    tags: filters.tag === null ? [] : [filters.tag],
    kind: filters.kind,
    favorite: filters.favorite === true,
  };
}
