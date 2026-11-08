import { LINK_IMAGE_KIND } from '@shelfmark/contracts';
import sharp from 'sharp';
import { MAX_INPUT_PIXELS } from './models/link-image-specs.const';
import { processLinkImage } from './process-link-image';
import { dib, ico, jpegWithExif, noisePng, solidFormat, solidPng } from './test-images';

const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');

describe('processLinkImage', () => {
  it('re-encodes a preview to a 640x360 WebP with a hash', async () => {
    const result = await processLinkImage(await solidPng(1200, 900), LINK_IMAGE_KIND.Preview);
    expect(result?.contentType).toBe('image/webp');
    expect(result).toMatchObject({ width: 640, height: 360 });
    expect(result?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result?.bytes.length).toBeLessThanOrEqual(64 * 1024);
    expect((await sharp(result?.bytes).metadata()).format).toBe('webp');
  });

  it('re-encodes a favicon to 32x32 and keeps a non-square icon whole', async () => {
    const result = await processLinkImage(await solidPng(100, 50), LINK_IMAGE_KIND.Favicon);
    expect(result).toMatchObject({ width: 32, height: 32, contentType: 'image/webp' });
    expect(result?.bytes.length).toBeLessThanOrEqual(8 * 1024);
  });

  it.each(['jpeg', 'gif', 'webp', 'avif'] as const)('accepts %s input', async (format) => {
    const result = await processLinkImage(await solidFormat(format), LINK_IMAGE_KIND.Preview);
    expect(result?.contentType).toBe('image/webp');
  });

  it('uses only the first frame of an animation', async () => {
    const frames = await sharp(
      Buffer.concat([Buffer.alloc(8 * 8 * 3, 255), Buffer.alloc(8 * 8 * 3, 0)]),
      { raw: { width: 8, height: 16, channels: 3 } },
    )
      .gif({ loop: 0 })
      .toBuffer();
    const result = await processLinkImage(frames, LINK_IMAGE_KIND.Favicon);
    expect(result).not.toBeNull();
  });

  it('strips metadata (EXIF) from the stored copy', async () => {
    const source = await jpegWithExif();
    expect((await sharp(source).metadata()).exif).toBeDefined();
    const result = await processLinkImage(source, LINK_IMAGE_KIND.Preview);
    const meta = await sharp(result?.bytes).metadata();
    expect(meta.exif).toBeUndefined();
    expect(result?.bytes.toString('latin1')).not.toContain('secret');
  });

  it('rejects SVG, HTML, text and empty input', async () => {
    for (const bytes of [
      SVG,
      Buffer.from('<html></html>'),
      Buffer.from('hello'),
      Buffer.alloc(0),
    ]) {
      expect(await processLinkImage(bytes, LINK_IMAGE_KIND.Preview)).toBeNull();
    }
  });

  it('rejects a damaged image', async () => {
    const png = await solidPng(50, 50);
    expect(await processLinkImage(png.subarray(0, 40), LINK_IMAGE_KIND.Preview)).toBeNull();
    const garbled = Buffer.concat([png.subarray(0, 40), Buffer.alloc(100, 7)]);
    expect(await processLinkImage(garbled, LINK_IMAGE_KIND.Preview)).toBeNull();
  });

  it('rejects an image above the pixel limit (decompression bomb)', async () => {
    // 6000 x 4100 = 24.6 MP of one colour: a few KB on the wire, huge when decoded.
    expect(6000 * 4100).toBeGreaterThan(MAX_INPUT_PIXELS);
    const bomb = await solidPng(6000, 4100);
    // Small enough to pass the 3 MB download limit.
    expect(bomb.length).toBeLessThan(3 * 1024 * 1024);
    expect(await processLinkImage(bomb, LINK_IMAGE_KIND.Preview)).toBeNull();
  });

  it('drops a preview that stays above 64 KB at every quality', async () => {
    expect(await processLinkImage(await noisePng(640, 360), LINK_IMAGE_KIND.Preview)).toBeNull();
  });

  describe('ico', () => {
    it('reads a PNG entry', async () => {
      const result = await processLinkImage(
        ico(await solidPng(32, 32), 32, 32),
        LINK_IMAGE_KIND.Favicon,
      );
      expect(result).toMatchObject({ width: 32, height: 32 });
    });

    it('reads a 32-bit BMP entry', async () => {
      const bytes = ico(dib(16, 16, 32, { r: 255, g: 0, b: 0, a: 255 }));
      const result = await processLinkImage(bytes, LINK_IMAGE_KIND.Favicon);
      expect(result).not.toBeNull();
      const { data } = await sharp(result?.bytes).raw().toBuffer({ resolveWithObject: true });
      // First pixel: red stays red (BGR order handled), opaque.
      expect(data[0]).toBeGreaterThan(200);
      expect(data[2]).toBeLessThan(60);
      expect(data[3]).toBe(255);
    });

    it('reads a 24-bit BMP entry with a transparency mask', async () => {
      const bytes = ico(dib(16, 16, 24, { r: 0, g: 0, b: 255, a: 0 }, true));
      const result = await processLinkImage(bytes, LINK_IMAGE_KIND.Favicon);
      expect(result).not.toBeNull();
      const { data, info } = await sharp(result?.bytes).raw().toBuffer({ resolveWithObject: true });
      expect(info.channels).toBe(4);
      expect(data[3]).toBe(0);
    });

    it('rejects broken ICO files', async () => {
      const png = await solidPng(16, 16);
      const broken = [
        Buffer.from([0, 0, 1, 0]),
        Buffer.from([0, 0, 1, 0, 0, 0]),
        Buffer.from([0, 0, 1, 0, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        // The entry points past the end of the file.
        ico(png).subarray(0, 40),
        // Not a DIB header size.
        ico(Buffer.alloc(60, 1)),
        // Unsupported bit depth (16) and compression.
        ico(
          Buffer.concat([
            Buffer.from([40, 0, 0, 0, 16, 0, 0, 0, 32, 0, 0, 0, 1, 0, 16, 0]),
            Buffer.alloc(60),
          ]),
        ),
        // A DIB whose pixel data is cut short.
        ico(dib(16, 16, 32, { r: 1, g: 1, b: 1, a: 1 }).subarray(0, 100)),
      ];
      for (const bytes of broken) {
        expect(await processLinkImage(bytes, LINK_IMAGE_KIND.Favicon)).toBeNull();
      }
    });
  });
});
