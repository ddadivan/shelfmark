import { IMAGE_FORMAT } from './models/image-format.const';
import { sniffImageFormat } from './sniff-image-format';
import { solidFormat, solidPng } from './test-images';

describe('sniffImageFormat', () => {
  it('names each allowed format from its bytes', async () => {
    expect(sniffImageFormat(await solidPng(8, 8))).toBe(IMAGE_FORMAT.Png);
    expect(sniffImageFormat(await solidFormat('jpeg'))).toBe(IMAGE_FORMAT.Jpeg);
    expect(sniffImageFormat(await solidFormat('gif'))).toBe(IMAGE_FORMAT.Gif);
    expect(sniffImageFormat(await solidFormat('webp'))).toBe(IMAGE_FORMAT.Webp);
    expect(sniffImageFormat(await solidFormat('avif'))).toBe(IMAGE_FORMAT.Avif);
    expect(sniffImageFormat(Buffer.from([0, 0, 1, 0, 1, 0]))).toBe(IMAGE_FORMAT.Ico);
  });

  it('is null for SVG, HTML, text, a bare RIFF and a truncated ftyp', () => {
    expect(sniffImageFormat(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImageFormat(Buffer.from('<!doctype html>'))).toBeNull();
    expect(sniffImageFormat(Buffer.from('RIFF....WAVE'))).toBeNull();
    expect(sniffImageFormat(Buffer.from('\0\0\0\x18ftypmp42\0\0\0\0isom'))).toBeNull();
    expect(sniffImageFormat(Buffer.from('\0\0\0\x18ftyp'))).toBeNull();
    expect(sniffImageFormat(Buffer.alloc(0))).toBeNull();
  });
});
