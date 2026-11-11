import { LINK_KIND } from './link-kind.const';
import { LINK_KIND_SHOP_HOSTS } from './link-kind-shop-hosts.const';
import { LINK_KIND_VIDEO_HOSTS } from './link-kind-video-hosts.const';
import type { LinkKind } from './link-kind.type';

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return null;
  }
}

function onHost(host: string, hosts: readonly string[]): boolean {
  return hosts.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

function fromOgType(ogType: string | null | undefined): LinkKind | null {
  const type = ogType?.trim().toLowerCase() ?? '';
  if (type === 'video' || type.startsWith('video.')) return LINK_KIND.Video;
  if (type === 'article') return LINK_KIND.Article;
  if (type === 'product' || type.startsWith('product.') || type === 'og:product') {
    return LINK_KIND.Shopping;
  }
  return null;
}

/**
 * The kind of a link (ADR 0038): the page's `og:type` first (`video.*` video, `article`,
 * `product` shopping), then the known video and shop hosts, else `other`. Pure and shared by
 * the API (save time) and the web mock; no network.
 */
export function deriveLinkKind(url: string, ogType?: string | null): LinkKind {
  const fromPage = fromOgType(ogType);
  if (fromPage !== null) return fromPage;
  const host = hostOf(url);
  if (host === null) return LINK_KIND.Other;
  if (onHost(host, LINK_KIND_VIDEO_HOSTS)) return LINK_KIND.Video;
  if (onHost(host, LINK_KIND_SHOP_HOSTS)) return LINK_KIND.Shopping;
  return LINK_KIND.Other;
}
