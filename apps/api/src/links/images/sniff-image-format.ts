import { IMAGE_FORMAT } from './models/image-format.const';
import type { ImageFormat } from './models/image-format.type';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const ICO = Buffer.from([0x00, 0x00, 0x01, 0x00]);
const AVIF_BRANDS: readonly string[] = ['avif', 'avis'];
const BRAND_AT = 8;
const BRAND_BYTES = 4;
const FTYP_AT = 4;
const MAX_BRAND_SCAN = 64;

function startsWith(bytes: Buffer, prefix: Buffer): boolean {
  return bytes.length >= prefix.length && bytes.subarray(0, prefix.length).equals(prefix);
}

function ascii(bytes: Buffer, from: number, length: number): string {
  return bytes.subarray(from, from + length).toString('latin1');
}

function isAvif(bytes: Buffer): boolean {
  if (bytes.length < BRAND_AT + BRAND_BYTES || ascii(bytes, FTYP_AT, 4) !== 'ftyp') return false;
  // Major brand, then the compatible brands (4 bytes each after the 4-byte minor version).
  const end = Math.min(bytes.length, Math.max(BRAND_AT + BRAND_BYTES, MAX_BRAND_SCAN));
  for (let at = BRAND_AT; at + BRAND_BYTES <= end; at += BRAND_BYTES) {
    if (at === BRAND_AT + BRAND_BYTES) continue;
    if (AVIF_BRANDS.includes(ascii(bytes, at, BRAND_BYTES))) return true;
  }
  return false;
}

/**
 * The format from the magic bytes; the remote `Content-Type` is never trusted. `null` for
 * everything else, SVG and HTML included.
 */
export function sniffImageFormat(bytes: Buffer): ImageFormat | null {
  if (startsWith(bytes, PNG)) return IMAGE_FORMAT.Png;
  if (startsWith(bytes, JPEG)) return IMAGE_FORMAT.Jpeg;
  const head = ascii(bytes, 0, 6);
  if (head === 'GIF87a' || head === 'GIF89a') return IMAGE_FORMAT.Gif;
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return IMAGE_FORMAT.Webp;
  if (isAvif(bytes)) return IMAGE_FORMAT.Avif;
  if (startsWith(bytes, ICO)) return IMAGE_FORMAT.Ico;
  return null;
}
