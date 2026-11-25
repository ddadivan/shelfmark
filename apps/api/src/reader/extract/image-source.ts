import type { HtmlElement } from '../../preview/models/html-element.type';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { READER_IMAGE_SKIP } from '../models/reader-image-skip.const';
import type { ReaderImageSource } from '../models/reader-image-source.interface';
import type { ReaderInlineContext } from '../models/reader-inline-context.interface';
import { cleanText } from './clean-text';
import { attributeOf, childrenOf, isElement, namesOf } from './html-tree';
import { toHttpUrl } from './resolve-url';

const SOURCE_ATTRIBUTES = ['src', 'data-src', 'data-lazy-src', 'data-original'] as const;
const SRCSET_ATTRIBUTES = ['srcset', 'data-srcset'] as const;

function firstSrcset(value: string | undefined): string | undefined {
  return value?.split(',')[0]?.trim().split(/\s+/)[0];
}

function declaredSmall(img: HtmlElement): boolean {
  return ['width', 'height'].some((name) => {
    const size = Number.parseInt(attributeOf(img, name) ?? '', 10);
    return Number.isFinite(size) && size < READER_IMAGE_SKIP.SizeMin;
  });
}

function pictureSource(picture: HtmlElement): HtmlElement | null {
  const children = childrenOf(picture).filter(isElement);
  return (
    children.find((child) => child.tagName === 'img') ??
    children.find((child) => child.tagName === 'source') ??
    null
  );
}

/**
 * The picture of an `<img>` or `<picture>`: the first of `src`, lazy-load attributes and
 * `srcset` that is an http(s) address (resolved against the page), with its alt text. `null` for
 * data URIs, icons, avatars, emoji, badges, tracking pixels and images declared under
 * `READER_IMAGE_SKIP.SizeMin` pixels. The address is never fetched.
 */
export function imageSource(
  element: HtmlElement,
  ctx: ReaderInlineContext,
): ReaderImageSource | null {
  const img = element.tagName === 'picture' ? pictureSource(element) : element;
  if (img === null) return null;
  if (READER_IMAGE_SKIP.Class.test(namesOf(img)) || declaredSmall(img)) return null;
  const candidates = [
    ...SOURCE_ATTRIBUTES.map((name) => attributeOf(img, name)),
    ...SRCSET_ATTRIBUTES.map((name) => firstSrcset(attributeOf(img, name))),
    firstSrcset(attributeOf(element, 'srcset')),
  ];
  for (const candidate of candidates) {
    const url = toHttpUrl(candidate, ctx.base);
    if (url !== null && !READER_IMAGE_SKIP.Source.test(url)) {
      return {
        url,
        alt: cleanText(attributeOf(img, 'alt') ?? '', READER_EXTRACT_LIMIT.AltCharsMax),
      };
    }
  }
  return null;
}
