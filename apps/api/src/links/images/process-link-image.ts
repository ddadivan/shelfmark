import { createHash } from 'node:crypto';
import type { LinkImageKind } from '@shelfmark/contracts';
import sharp, { type Sharp } from 'sharp';
import { decodeIco } from './decode-ico';
import { IMAGE_FORMAT } from './models/image-format.const';
import { LINK_IMAGE_SPECS, MAX_INPUT_PIXELS } from './models/link-image-specs.const';
import type { ProcessedImage } from './models/processed-image.interface';
import { sniffImageFormat } from './sniff-image-format';

const WEBP_CONTENT_TYPE = 'image/webp';
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const RGBA_CHANNELS = 4;

// No decoder cache and one thread: a request must not hold on to decoded remote pixels.
sharp.cache(false);
sharp.concurrency(1);

function open(bytes: Buffer): Sharp | null {
  const format = sniffImageFormat(bytes);
  if (format === null) return null;
  const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error', pages: 1 } as const;
  if (format !== IMAGE_FORMAT.Ico) return sharp(bytes, options);
  const ico = decodeIco(bytes);
  if (ico === null) return null;
  if (ico.kind === 'png') return sharp(ico.png, options);
  return sharp(ico.raw, {
    ...options,
    raw: { width: ico.width, height: ico.height, channels: RGBA_CHANNELS },
  });
}

/**
 * Decodes the first frame of an untrusted image, strips every piece of metadata and re-encodes
 * it as WebP in the size of its kind (ADR 0027). The original bytes are never kept or served.
 * `null` when the format is not allowed (SVG, HTML, ...), the pixels exceed the limit, the file
 * is damaged, or no quality keeps the copy under its size cap.
 */
export async function processLinkImage(
  bytes: Buffer,
  kind: LinkImageKind,
): Promise<ProcessedImage | null> {
  const spec = LINK_IMAGE_SPECS[kind];
  try {
    const source = open(bytes);
    if (source === null) return null;
    const resized = source
      .rotate()
      .resize(spec.width, spec.height, { fit: spec.fit, background: TRANSPARENT });
    for (const quality of spec.qualities) {
      // `toBuffer` runs the whole pipeline again; the metadata (EXIF, ICC, XMP) is dropped by default.
      const { data, info } = await resized
        .clone()
        .webp({ quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      if (data.length <= spec.maxBytes) {
        return {
          bytes: data,
          contentType: WEBP_CONTENT_TYPE,
          width: info.width,
          height: info.height,
          sha256: createHash('sha256').update(data).digest('hex'),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
