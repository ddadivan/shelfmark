import type { ExportFolderRow } from './models/export-folder-row.interface';
import type { ExportLinkRow } from './models/export-link-row.interface';
import { escapeHtml, safeHref } from './escape-html';

const unixSeconds = (date: Date): number => Math.floor(date.getTime() / 1000);

export const BOOKMARKS_HEAD = [
  '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
  '<!-- This is an automatically generated file. It will be read and overwritten. -->',
  '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
  '<TITLE>Shelfmark bookmarks</TITLE>',
  '<H1>Shelfmark bookmarks</H1>',
  '<DL><p>',
  '',
].join('\n');

export const BOOKMARKS_TAIL = '</DL><p>\n';

const indent = (depth: number): string => '    '.repeat(depth);

export function renderFolderOpen(folder: ExportFolderRow, depth: number): string {
  return (
    `${indent(depth)}<DT><H3 ADD_DATE="${unixSeconds(folder.createdAt)}"` +
    ` LAST_MODIFIED="${unixSeconds(folder.updatedAt)}">${escapeHtml(folder.name)}</H3>\n` +
    `${indent(depth)}<DL><p>\n`
  );
}

export function renderFolderClose(depth: number): string {
  return `${indent(depth)}</DL><p>\n`;
}

/** One `<DT><A>` entry; a link whose URL is not http(s) is dropped (empty string). */
export function renderBookmark(link: ExportLinkRow, depth: number): string {
  const href = safeHref(link.url);
  if (href === null) return '';
  // The attribute is comma-separated, so a comma inside a tag name becomes a hyphen.
  // TAGS is comma-separated, so a comma inside a tag name becomes a hyphen.
  const tags = link.tags.map((entry) => entry.tag.name.replaceAll(',', '-')).join(',');
  const attrs =
    ` HREF="${escapeHtml(href)}" ADD_DATE="${unixSeconds(link.createdAt)}"` +
    ` LAST_MODIFIED="${unixSeconds(link.updatedAt)}"` +
    (tags ? ` TAGS="${escapeHtml(tags)}"` : '');
  const note = link.note ? `${indent(depth)}<DD>${escapeHtml(link.note)}\n` : '';
  return `${indent(depth)}<DT><A${attrs}>${escapeHtml(link.title)}</A>\n${note}`;
}
