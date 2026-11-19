import { linkHost } from './link-host';
import { LINK_KIND } from './link-kind.const';
import { LINK_KIND_SHOP_HOSTS } from './link-kind-shop-hosts.const';
import type { LinkKindSignals } from './link-kind-signals.interface';
import { LINK_KIND_URL_RULES } from './link-kind-url-rules.const';
import { LINK_KIND_VIDEO_HOSTS } from './link-kind-video-hosts.const';
import type { LinkKind } from './link-kind.type';
import { PDF_CONTENT_TYPES } from './pdf-content-types.const';

const PDF_PATH = /\.pdf$/;
const RECIPE_TYPE = 'recipe';

function onHost(host: string, hosts: readonly string[]): boolean {
  return hosts.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

function hasPrefix(type: string, names: readonly string[]): boolean {
  return names.some((name) => type === name || type.startsWith(`${name}.`));
}

function fromOgType(ogType: string | null | undefined): LinkKind | null {
  const type = ogType?.trim().toLowerCase() ?? '';
  if (type === '') return null;
  if (hasPrefix(type, ['video'])) return LINK_KIND.Video;
  if (hasPrefix(type, ['audio', 'podcast'])) return LINK_KIND.Podcast;
  if (hasPrefix(type, ['app', 'application', 'software'])) return LINK_KIND.App;
  if (hasPrefix(type, ['recipe'])) return LINK_KIND.Recipe;
  if (type === 'article') return LINK_KIND.Article;
  if (hasPrefix(type, ['product']) || type === 'og:product') return LINK_KIND.Shopping;
  return null;
}

/** `Recipe`, `schema:Recipe` and `https://schema.org/Recipe` all name the same type. */
function isRecipeType(name: string): boolean {
  const last = name.trim().split(/[/:#]/).pop() ?? '';
  return last.toLowerCase() === RECIPE_TYPE;
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * The kind of a link (ADR 0038, ADR 0058), first match wins: a PDF (response type or `.pdf` path)
 * is a document; then the certain hosts and paths of `LINK_KIND_URL_RULES` (podcasts, documents,
 * code, apps, posts); a schema.org `Recipe` in the page; the page's `og:type` (`video.*`, audio or
 * podcast, app, `article`, `product`); the known video and shop hosts; else `other`. Pure and
 * deterministic, shared by the API (save time) and the web mock; no network.
 */
export function deriveLinkKind(url: string, signals: LinkKindSignals = {}): LinkKind {
  const host = linkHost(url);
  const path = pathOf(url);
  const contentType = signals.contentType?.trim().toLowerCase() ?? '';
  if (PDF_CONTENT_TYPES.includes(contentType) || PDF_PATH.test(path)) return LINK_KIND.Document;
  if (host !== null) {
    const rule = LINK_KIND_URL_RULES.find(
      (entry) => onHost(host, entry.hosts) && (entry.path === undefined || entry.path.test(path)),
    );
    if (rule !== undefined) return rule.kind;
  }
  if (signals.schemaTypes?.some(isRecipeType)) return LINK_KIND.Recipe;
  const fromPage = fromOgType(signals.ogType);
  if (fromPage !== null) return fromPage;
  if (host === null) return LINK_KIND.Other;
  if (onHost(host, LINK_KIND_VIDEO_HOSTS)) return LINK_KIND.Video;
  if (onHost(host, LINK_KIND_SHOP_HOSTS)) return LINK_KIND.Shopping;
  return LINK_KIND.Other;
}
