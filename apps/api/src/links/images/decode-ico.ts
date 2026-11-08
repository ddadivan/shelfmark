import { DECODED_ICO_KIND } from './models/decoded-ico-kind.const';
import type { DecodedIco } from './models/decoded-ico.type';
import type { IcoEntry } from './models/ico-entry.interface';

const HEADER_BYTES = 6;
const ENTRY_BYTES = 16;
const MAX_ENTRIES = 64;
const MAX_SIDE = 256;
const DIB_HEADER_BYTES = 40;
const COMPRESSION_NONE = 0;
const COMPRESSION_BITFIELDS = 3;
const SUPPORTED_DEPTHS: readonly number[] = [1, 4, 8, 24, 32];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const RGBA = 4;

function readEntries(bytes: Buffer): IcoEntry[] {
  if (bytes.length < HEADER_BYTES) return [];
  const count = bytes.readUInt16LE(4);
  if (count === 0 || count > MAX_ENTRIES || bytes.length < HEADER_BYTES + count * ENTRY_BYTES) {
    return [];
  }
  const entries: IcoEntry[] = [];
  for (let index = 0; index < count; index++) {
    const at = HEADER_BYTES + index * ENTRY_BYTES;
    const size = bytes.readUInt32LE(at + 8);
    const offset = bytes.readUInt32LE(at + 12);
    // An entry that points outside the file is ignored, never trusted.
    if (size > 0 && offset + size <= bytes.length) {
      entries.push({
        width: bytes[at] || MAX_SIDE,
        height: bytes[at + 1] || MAX_SIDE,
        depth: bytes.readUInt16LE(at + 6),
        offset,
        size,
      });
    }
  }
  return entries;
}

/** The biggest image wins; at equal size the deeper colour. */
function pickBest(entries: readonly IcoEntry[]): IcoEntry | undefined {
  return [...entries].sort(
    (a, b) => b.width * b.height - a.width * a.height || b.depth - a.depth,
  )[0];
}

function decodeDib(data: Buffer): DecodedIco | null {
  if (data.length < DIB_HEADER_BYTES || data.readUInt32LE(0) !== DIB_HEADER_BYTES) return null;
  const width = data.readInt32LE(4);
  // The stored height covers the colour rows and the 1-bit mask rows.
  const height = Math.trunc(data.readInt32LE(8) / 2);
  const depth = data.readUInt16LE(14);
  const compression = data.readUInt32LE(16);
  const supportedCompression =
    compression === COMPRESSION_NONE || (compression === COMPRESSION_BITFIELDS && depth === 32);
  if (
    width < 1 ||
    height < 1 ||
    width > MAX_SIDE ||
    height > MAX_SIDE ||
    !SUPPORTED_DEPTHS.includes(depth) ||
    !supportedCompression
  ) {
    return null;
  }
  const paletteSize = depth <= 8 ? 1 << depth : 0;
  const declared = data.readUInt32LE(32);
  const colors = depth <= 8 ? Math.min(declared === 0 ? paletteSize : declared, paletteSize) : 0;
  const paletteAt = DIB_HEADER_BYTES + (compression === COMPRESSION_BITFIELDS ? 12 : 0);
  const xorAt = paletteAt + colors * RGBA;
  const xorStride = ((width * depth + 31) >> 5) << 2;
  const maskAt = xorAt + xorStride * height;
  const maskStride = ((width + 31) >> 5) << 2;
  if (data.length < xorAt + xorStride * height) return null;
  const hasMask = data.length >= maskAt + maskStride * height;

  const raw = Buffer.alloc(width * height * RGBA);
  let anyAlpha = false;
  for (let y = 0; y < height; y++) {
    const row = xorAt + (height - 1 - y) * xorStride;
    for (let x = 0; x < width; x++) {
      const out = (y * width + x) * RGBA;
      if (depth === 32 || depth === 24) {
        const at = row + x * (depth / 8);
        raw[out] = data[at + 2] ?? 0;
        raw[out + 1] = data[at + 1] ?? 0;
        raw[out + 2] = data[at] ?? 0;
        raw[out + 3] = depth === 32 ? (data[at + 3] ?? 0) : 255;
        anyAlpha ||= depth === 32 && raw[out + 3] !== 0;
      } else {
        const bitAt = x * depth;
        const byte = data[row + (bitAt >> 3)] ?? 0;
        const index = (byte >> (8 - depth - (bitAt & 7))) & ((1 << depth) - 1);
        const color = paletteAt + Math.min(index, Math.max(colors - 1, 0)) * RGBA;
        raw[out] = data[color + 2] ?? 0;
        raw[out + 1] = data[color + 1] ?? 0;
        raw[out + 2] = data[color] ?? 0;
        raw[out + 3] = 255;
      }
    }
  }
  // Below 32 bits (or a 32-bit image with no alpha at all) transparency comes from the 1-bit mask.
  if (hasMask && !(depth === 32 && anyAlpha)) {
    for (let y = 0; y < height; y++) {
      const row = maskAt + (height - 1 - y) * maskStride;
      for (let x = 0; x < width; x++) {
        const masked = ((data[row + (x >> 3)] ?? 0) >> (7 - (x & 7))) & 1;
        const out = (y * width + x) * RGBA;
        raw[out + 3] = masked === 1 ? 0 : 255;
      }
    }
  } else if (depth === 32 && !anyAlpha) {
    for (let at = 3; at < raw.length; at += RGBA) raw[at] = 255;
  }
  return { kind: DECODED_ICO_KIND.Raw, raw, width, height };
}

/**
 * Reads the biggest image of an ICO file. libvips has no ICO loader, so a PNG entry is handed
 * over as PNG and a classic BMP entry (1, 4, 8, 24 or 32 bits, uncompressed) becomes raw RGBA.
 * Anything else, and every inconsistent length, is `null` (the favicon is then dropped).
 */
export function decodeIco(bytes: Buffer): DecodedIco | null {
  const best = pickBest(readEntries(bytes));
  if (best === undefined) return null;
  const data = bytes.subarray(best.offset, best.offset + best.size);
  if (data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return { kind: DECODED_ICO_KIND.Png, png: data };
  }
  return decodeDib(data);
}
