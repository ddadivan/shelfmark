import type { ExportFormat, LinkKind } from '@shelfmark/contracts';
import type { ExportScope } from '../models/export-scope.interface';
import type { LinksFilter } from '../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';

/**
 * The export scope of a feed filter, or `undefined` when the view has no export equivalent:
 * the API filters by folder, tags and search only, so "Unsorted" and "Favorites" cannot be
 * exported on their own. A view without any narrowing is the whole library, also `undefined`.
 */
export function exportScopeOf(filter: LinksFilter): ExportScope | undefined {
  if (filter.scope === LINKS_SCOPE.Unsorted || filter.scope === LINKS_SCOPE.Favorites) {
    return undefined;
  }
  const scope: { folderId?: string; tags?: readonly string[]; q?: string; kind?: LinkKind } = {};
  if (filter.scope === LINKS_SCOPE.Folder) {
    scope.folderId = filter.folderId;
  }
  if (filter.tags && filter.tags.length > 0) {
    scope.tags = filter.tags;
  }
  if (filter.q) {
    scope.q = filter.q;
  }
  if (filter.kind !== undefined) {
    scope.kind = filter.kind;
  }
  return Object.keys(scope).length > 0 ? scope : undefined;
}

/**
 * `GET /api/export` URL: `format`, then `folderId`, one `tag` per name and `q`, all
 * percent-encoded by `URLSearchParams`. `base` is the relative API base (`/api`).
 */
export function buildExportUrl(base: string, format: ExportFormat, scope: ExportScope): string {
  const params = new URLSearchParams({ format });
  if (scope.folderId !== undefined) {
    params.append('folderId', scope.folderId);
  }
  for (const tag of scope.tags ?? []) {
    params.append('tag', tag);
  }
  if (scope.q) {
    params.append('q', scope.q);
  }
  if (scope.kind !== undefined) {
    params.append('kind', scope.kind);
  }
  return `${base}/export?${params.toString()}`;
}
