import {
  FOLDER_LIMIT,
  IMPORT_LIMIT,
  isStorableUrl,
  LINK_LIMIT,
  normalizeTagName,
  stripTrackingParams,
  TAG_LIMIT,
} from '@shelfmark/contracts';
import type { BookmarkDraftFolder } from '../models/bookmark-draft-folder.interface';
import type { BookmarkWalk } from '../models/bookmark-walk.interface';
import type { ParsedImport } from '../models/parsed-import.interface';
import type { ParsedImportFolder } from '../models/parsed-import-folder.interface';
import type { ParsedImportLink } from '../models/parsed-import-link.interface';
import { bookmarkDate } from './bookmark-date';
import { cleanLine, cleanNote } from './clean-text';
import { ImportParseError } from './import-parse-error';

const NETSCAPE_DOCTYPE = /<!DOCTYPE\s+NETSCAPE-Bookmark-file-1>/i;

/**
 * Reads a Netscape bookmark file (the HTML export of Chrome, Firefox, Safari and Edge, ADR 0056).
 * The text is parsed by `DOMParser` into a detached document that is never attached or rendered;
 * only `textContent` and attribute values are read. `<DT><H3>` is a folder (its list is the `<DL>`
 * inside the same `<DT>`, or inside a `<DD>` description after it), `<DT><A HREF>` a link (`TAGS`
 * as tags, `ADD_DATE` as the date added, a following `<DD>` as its note). Only http(s) URLs are
 * kept; folders deeper than `IMPORT_LIMIT.DepthMax` join their deepest kept ancestor; folders
 * without links are left out. `untitled` names a folder that has no name.
 */
export function parseNetscapeBookmarks(
  text: string,
  untitled: string,
  now: number = Date.now(),
): ParsedImport {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  if (!NETSCAPE_DOCTYPE.test(text.slice(0, 1024)) && doc.querySelector('dl') === null) {
    throw new ImportParseError();
  }
  const walk: BookmarkWalk = { folders: [], links: [], untitled, now, notWeb: 0 };
  // The body is the top-level list: Chrome and Firefox wrap it in a `<DL>`, Safari does not.
  walkList(doc.body, null, 0, walk);
  return { folders: prune(walk.folders, walk.links), links: walk.links, notWeb: walk.notWeb };
}

/** Walks the entries of one `<DL>`, looking through wrappers the HTML parser may leave (`<p>`). */
function walkList(
  list: Element,
  folderKey: string | null,
  depth: number,
  walk: BookmarkWalk,
): void {
  for (const entry of entries(list)) {
    const heading = childOf(entry, 'h3');
    if (heading !== null) {
      const key =
        depth < IMPORT_LIMIT.DepthMax ? addFolder(heading, folderKey, depth, walk) : folderKey;
      const inner = childOf(entry, 'dl') ?? descriptionList(entry);
      if (inner !== null) {
        walkList(inner, key, depth < IMPORT_LIMIT.DepthMax ? depth + 1 : depth, walk);
      }
      continue;
    }
    const anchor = childOf(entry, 'a');
    if (anchor !== null) {
      addLink(anchor, entry, folderKey, walk);
    }
  }
}

/**
 * The `<DT>` entries of a list, through wrapper elements (`<p>`, the top-level `<DL>`). A nested
 * list is reached only through its folder's `<DT>`, and a `<DD>` is a note or description.
 */
function entries(list: Element): Element[] {
  const found: Element[] = [];
  for (const child of Array.from(list.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === 'dt') {
      found.push(child);
    } else if (tag !== 'dd') {
      found.push(...entries(child));
    }
  }
  return found;
}

function childOf(element: Element, tag: string): Element | null {
  return Array.from(element.children).find((child) => child.tagName.toLowerCase() === tag) ?? null;
}

/** A folder with a description: `<DT><H3>…</H3><DD>text<DL>…` puts the list inside the `<DD>`. */
function descriptionList(entry: Element): Element | null {
  const next = entry.nextElementSibling;
  return next !== null && next.tagName.toLowerCase() === 'dd' ? childOf(next, 'dl') : null;
}

function addFolder(
  heading: Element,
  parentKey: string | null,
  depth: number,
  walk: BookmarkWalk,
): string {
  const key = `f${walk.folders.length + 1}`;
  const name = cleanLine(heading.textContent, FOLDER_LIMIT.NameMax) || walk.untitled;
  walk.folders.push({ key, parentKey, name, depth });
  return key;
}

function addLink(
  anchor: Element,
  entry: Element,
  folderKey: string | null,
  walk: BookmarkWalk,
): void {
  const url = webUrl(anchor.getAttribute('href'));
  if (url === null) {
    walk.notWeb += 1;
    return;
  }
  const title = cleanLine(anchor.textContent, LINK_LIMIT.TitleMax);
  const next = entry.nextElementSibling;
  const note =
    next !== null && next.tagName.toLowerCase() === 'dd'
      ? cleanNote(ownText(next), LINK_LIMIT.NoteMax)
      : '';
  const addedAt = bookmarkDate(anchor.getAttribute('add_date'), walk.now);
  walk.links.push({
    url,
    folderKey,
    tags: tagsOf(anchor.getAttribute('tags')),
    ...(title !== '' && { title }),
    ...(note !== '' && { note }),
    ...(addedAt !== undefined && { addedAt }),
  });
}

/** The text of a `<DD>` without a list the parser may have put inside it. */
function ownText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => !(node instanceof Element && node.tagName.toLowerCase() === 'dl'))
    .map((node) => node.textContent ?? '')
    .join('');
}

/**
 * The trimmed address when the API would store it (`isStorableUrl`: http(s), no credentials, no
 * control characters, within the length limit, also after the tracking parameters are dropped),
 * else `null`.
 */
function webUrl(href: string | null): string | null {
  const value = (href ?? '').trim();
  return value !== '' && isStorableUrl(value) && isStorableUrl(stripTrackingParams(value))
    ? value
    : null;
}

/** Firefox's `TAGS="a,b"`: normalised names, no repeats (any case), within the tag limits. */
function tagsOf(value: string | null): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const raw of (value ?? '').split(',')) {
    const name = normalizeTagName(cleanLine(raw, TAG_LIMIT.NameMax * 4));
    if (name === '' || name.length > TAG_LIMIT.NameMax || seen.has(name.toLowerCase())) {
      continue;
    }
    seen.add(name.toLowerCase());
    tags.push(name);
    if (tags.length === LINK_LIMIT.TagsMax) {
      break;
    }
  }
  return tags;
}

/** Keeps the folders that hold a link themselves or below them, in file order. */
function prune(
  folders: readonly BookmarkDraftFolder[],
  links: readonly ParsedImportLink[],
): ParsedImportFolder[] {
  const parents = new Map(folders.map((folder) => [folder.key, folder.parentKey]));
  const used = new Set<string>();
  for (const link of links) {
    let key = link.folderKey;
    while (key !== null && !used.has(key)) {
      used.add(key);
      key = parents.get(key) ?? null;
    }
  }
  return folders
    .filter((folder) => used.has(folder.key))
    .map(({ key, parentKey, name }) => ({ key, parentKey, name }));
}
