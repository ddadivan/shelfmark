import { decodeIco } from './decode-ico';
import { DECODED_ICO_KIND } from './models/decoded-ico-kind.const';
import { dib, ico, solidPng } from './test-images';

const PIXEL = { r: 255, g: 0, b: 0, a: 255 };

/** Overwrites bytes of a valid DIB-based ICO (directory at 6..22, DIB header from 22). */
function patched(offset: number, bytes: number[]): Buffer {
  const file = ico(dib(16, 16, 32, PIXEL));
  Buffer.from(bytes).copy(file, offset);
  return file;
}

describe('decodeIco', () => {
  it('returns an embedded PNG as it is', async () => {
    const png = await solidPng(16, 16);
    expect(decodeIco(ico(png))?.kind).toBe(DECODED_ICO_KIND.Png);
  });

  it('decodes a 32-bit and a 24-bit BMP entry to RGBA', () => {
    const rgba = decodeIco(ico(dib(4, 2, 32, PIXEL), 4, 2));
    expect(rgba).toMatchObject({ kind: DECODED_ICO_KIND.Raw, width: 4, height: 2 });
    const rgb = decodeIco(ico(dib(4, 2, 24, { r: 1, g: 2, b: 3, a: 0 }), 4, 2, 24));
    expect(rgb?.kind === DECODED_ICO_KIND.Raw && [...rgb.raw.subarray(0, 4)]).toEqual([
      1, 2, 3, 255,
    ]);
  });

  it('picks the biggest entry', () => {
    const small = dib(2, 2, 32, PIXEL);
    const big = dib(8, 8, 32, PIXEL);
    const file = Buffer.alloc(6 + 32);
    file.writeUInt16LE(1, 2);
    file.writeUInt16LE(2, 4);
    const entry = (at: number, side: number, data: Buffer, offset: number): void => {
      file[at] = side;
      file[at + 1] = side;
      file.writeUInt16LE(32, at + 6);
      file.writeUInt32LE(data.length, at + 8);
      file.writeUInt32LE(offset, at + 12);
    };
    entry(6, 2, small, 38);
    entry(22, 8, big, 38 + small.length);
    expect(decodeIco(Buffer.concat([file, small, big]))).toMatchObject({ width: 8, height: 8 });
  });

  it('rejects a truncated header and a missing directory', () => {
    expect(decodeIco(Buffer.alloc(0))).toBeNull();
    expect(decodeIco(Buffer.from([0, 0, 1, 0, 1]))).toBeNull();
    expect(decodeIco(Buffer.from([0, 0, 1, 0, 1, 0, 0, 0]))).toBeNull();
  });

  it('rejects a count of 0 and a count above 64', () => {
    expect(decodeIco(patched(4, [0, 0]))).toBeNull();
    expect(decodeIco(patched(4, [65, 0]))).toBeNull();
  });

  it('ignores an entry whose offset or size leaves the file', () => {
    expect(decodeIco(patched(14, [0xff, 0xff, 0xff, 0x7f]))).toBeNull();
    expect(decodeIco(patched(18, [0xff, 0xff, 0xff, 0x7f]))).toBeNull();
    expect(decodeIco(patched(14, [0, 0, 0, 0]))).toBeNull();
  });

  it('rejects a DIB with a wrong header size', () => {
    expect(decodeIco(patched(22, [12]))).toBeNull();
  });

  it.each([
    ['width 0', 26, [0, 0, 0, 0]],
    ['width above 256', 26, [0x2c, 0x01, 0, 0]],
    ['height 0', 30, [0, 0, 0, 0]],
    ['height above 256', 30, [0x58, 0x02, 0, 0]],
    ['negative width', 26, [0xff, 0xff, 0xff, 0xff]],
    ['16-bit depth', 36, [16, 0]],
    ['RLE compression', 38, [1, 0, 0, 0]],
  ])('rejects a DIB with %s', (_label, offset, bytes) => {
    const file = ico(dib(16, 16, 32, PIXEL));
    Buffer.from(bytes).copy(file, offset);
    expect(decodeIco(file)).toBeNull();
  });

  it('rejects bitfields compression below 32 bits', () => {
    const file = ico(dib(16, 16, 24, PIXEL), 16, 16, 24);
    file.writeUInt32LE(3, 38);
    expect(decodeIco(file)).toBeNull();
  });

  it('decodes a palette entry (8 bits) with its mask', () => {
    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0);
    header.writeInt32LE(8, 4);
    header.writeInt32LE(16, 8);
    header.writeUInt16LE(1, 12);
    header.writeUInt16LE(8, 14);
    header.writeUInt32LE(2, 32);
    const palette = Buffer.from([0, 0, 255, 0, 0, 255, 0, 0]);
    const pixels = Buffer.alloc(8 * 8, 1);
    const mask = Buffer.alloc(4 * 8, 0xff);
    const result = decodeIco(ico(Buffer.concat([header, palette, pixels, mask]), 8, 8, 8));
    expect(result?.kind === DECODED_ICO_KIND.Raw && [...result.raw.subarray(0, 4)]).toEqual([
      0, 255, 0, 0,
    ]);
  });
});
