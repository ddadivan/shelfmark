import type { LinkPreview } from '@shelfmark/contracts';
import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { ALLOWED_PROTOCOLS } from '../fetcher/models/allowed-protocols.const';
import { HTML_TAG } from './models/html-tag.const';
import { META_KEY } from './models/meta-key.const';
import { PREVIEW_LIMITS } from './models/preview-limits.const';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

const FAVICON_PATH = '/favicon.ico';
const ICON_REL = 'icon';
const APPLE_ICON_REL = 'apple-touch-icon';

interface CollectedTags {
  meta: Map<string, string>;
  title: string | null;
  icons: string[];
  appleIcons: string[];
}

function attribute(element: Element, name: string): string | undefined {
  return element.attrs.find((attr) => attr.name === name)?.value;
}

function textOf(element: Element): string {
  return element.childNodes
    .map((child) => ('value' in child && child.nodeName === '#text' ? child.value : ''))
    .join('');
}

/** Iterative walk (no recursion, so deeply nested markup cannot overflow the stack). */
function collect(root: Node): CollectedTags {
  const tags: CollectedTags = { meta: new Map(), title: null, icons: [], appleIcons: [] };
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined || !('childNodes' in node)) {
      continue;
    }
    if ('tagName' in node) {
      if (node.tagName === HTML_TAG.Meta) {
        const key = (attribute(node, 'property') ?? attribute(node, 'name'))?.toLowerCase();
        const content = attribute(node, 'content');
        if (key !== undefined && content !== undefined && !tags.meta.has(key)) {
          tags.meta.set(key, content);
        }
      } else if (node.tagName === HTML_TAG.Title && tags.title === null) {
        tags.title = textOf(node);
      } else if (node.tagName === HTML_TAG.Link) {
        const rel = (attribute(node, 'rel') ?? '').toLowerCase().split(/\s+/);
        const href = attribute(node, 'href');
        if (href !== undefined && href.trim() !== '') {
          if (rel.includes(ICON_REL)) {
            tags.icons.push(href);
          } else if (rel.includes(APPLE_ICON_REL)) {
            tags.appleIcons.push(href);
          }
        }
      }
    }
    // Reverse push keeps document order for "first match wins".
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i];
      if (child !== undefined) {
        stack.push(child);
      }
    }
    if ('content' in node && node.nodeName === 'template') {
      stack.push(node.content);
    }
  }
  return tags;
}

function clean(value: string | null | undefined, maxLength: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = value.replace(/\s+/g, ' ').trim();
  if (text === '') {
    return null;
  }
  // Array.from counts code points, so a surrogate pair is never cut in half.
  return Array.from(text).slice(0, maxLength).join('');
}

function firstOf(meta: Map<string, string>, keys: readonly string[]): string | undefined {
  return keys
    .map((key) => meta.get(key))
    .find((value) => value !== undefined && value.trim() !== '');
}

/** Resolves against the page URL; only absolute http(s) URLs are returned. */
function absoluteHttpUrl(value: string | undefined, base: string): string | null {
  if (value === undefined) {
    return null;
  }
  try {
    const url = new URL(value.trim(), base);
    const protocols: readonly string[] = Object.values(ALLOWED_PROTOCOLS);
    return protocols.includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function originFavicon(pageUrl: string): string | null {
  return absoluteHttpUrl(FAVICON_PATH, pageUrl);
}

/** Preview for a page that could not be fetched: the URL is the title. */
export function fallbackPreview(pageUrl: string): LinkPreview {
  return {
    url: pageUrl,
    title: clean(pageUrl, PREVIEW_LIMITS.maxTitleLength) ?? pageUrl,
    description: null,
    imageUrl: null,
    faviconUrl: originFavicon(pageUrl),
  };
}

const HEAD_END = /<\/head\s*>/i;

/** Preview data lives in `<head>`; parsing the rest only costs CPU (parse5 is quadratic on deep nesting). */
function headOf(html: string): string {
  const capped = html.slice(0, PREVIEW_LIMITS.maxParsedChars);
  const end = HEAD_END.exec(capped);
  return end === null ? capped : capped.slice(0, end.index);
}

/** Extracts the preview of an HTML document. `pageUrl` is the final URL after redirects. */
export function extractPreview(html: string, pageUrl: string): LinkPreview {
  const tags = collect(parse(headOf(html)));
  const title =
    clean(
      firstOf(tags.meta, [META_KEY.OgTitle, META_KEY.TwitterTitle]),
      PREVIEW_LIMITS.maxTitleLength,
    ) ??
    clean(tags.title, PREVIEW_LIMITS.maxTitleLength) ??
    clean(pageUrl, PREVIEW_LIMITS.maxTitleLength) ??
    pageUrl;
  const description = clean(
    firstOf(tags.meta, [META_KEY.OgDescription, META_KEY.TwitterDescription, META_KEY.Description]),
    PREVIEW_LIMITS.maxDescriptionLength,
  );
  const imageUrl = absoluteHttpUrl(
    firstOf(tags.meta, [
      META_KEY.OgImage,
      META_KEY.OgImageUrl,
      META_KEY.TwitterImage,
      META_KEY.TwitterImageSrc,
    ]),
    pageUrl,
  );
  const faviconUrl =
    [...tags.icons, ...tags.appleIcons]
      .map((href) => absoluteHttpUrl(href, pageUrl))
      .find((href) => href !== null) ?? originFavicon(pageUrl);

  return { url: pageUrl, title, description, imageUrl, faviconUrl };
}
