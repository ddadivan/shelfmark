import { randomBytes } from 'node:crypto';
import sharp from 'sharp';

const RGBA = 4;

/** Test-only builders of image files; every image is generated, nothing is fetched. */
export function solidPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } },
  })
    .png()
    .toBuffer();
}

export function solidFormat(
  format: 'jpeg' | 'gif' | 'webp' | 'avif',
  width = 64,
  height = 48,
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 120, b: 200 } },
  })
    [format]()
    .toBuffer();
}

/** Random pixels do not compress: a 640x360 copy of it is far above the 64 KB cap. */
export function noisePng(width: number, height: number): Promise<Buffer> {
  return sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

/** A JPEG with an EXIF block (camera and GPS-like fields) that must not survive. */
export function jpegWithExif(): Promise<Buffer> {
  return sharp({ create: { width: 40, height: 30, channels: 3, background: '#336699' } })
    .withExif({ IFD0: { Copyright: 'secret-copyright', Artist: 'secret-artist' } })
    .jpeg()
    .toBuffer();
}

/** An ICO file with one entry. `payload` is a PNG, or a DIB built by `dib`. */
export function ico(payload: Buffer, width = 16, height = 16, depth = 32): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = width;
  header[7] = height;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(depth, 12);
  header.writeUInt32LE(payload.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, payload]);
}

/** A DIB (BMP without file header) as stored in ICO: pixels bottom-up, then the AND mask. */
export function dib(
  width: number,
  height: number,
  depth: 24 | 32,
  pixel: { r: number; g: number; b: number; a: number },
  masked = false,
): Buffer {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(width, 4);
  header.writeInt32LE(height * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(depth, 14);
  const stride = ((width * depth + 31) >> 5) << 2;
  const rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * stride + x * (depth / 8);
      rows[at] = pixel.b;
      rows[at + 1] = pixel.g;
      rows[at + 2] = pixel.r;
      if (depth === 32) rows[at + 3] = pixel.a;
    }
  }
  const maskStride = ((width + 31) >> 5) << 2;
  const mask = Buffer.alloc(maskStride * height, masked ? 0xff : 0);
  return Buffer.concat([header, rows, mask]);
}

export const RGBA_CHANNELS = RGBA;
