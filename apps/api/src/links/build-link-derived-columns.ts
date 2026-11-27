import { deriveLinkKind, linkSiteKey, linkTitleSortKey, normalizeUrl } from '@shelfmark/contracts';
import type { LinkDerivedColumns } from './models/link-derived-columns.interface';
import type { LinkDerivedHints } from './models/link-derived-hints.interface';

/**
 * `normalizedUrl`, `titleSortKey`, `host` and `kind` of a new link row, the one place that builds
 * them (create, batch create, the demo seed and test fixtures all call it).
 */
export function buildLinkDerivedColumns(
  url: string,
  title: string,
  hints: LinkDerivedHints = {},
): LinkDerivedColumns {
  return {
    normalizedUrl: hints.normalizedUrl ?? normalizeUrl(url),
    titleSortKey: linkTitleSortKey(title),
    host: linkSiteKey(url),
    kind: hints.kind ?? deriveLinkKind(url),
  };
}
