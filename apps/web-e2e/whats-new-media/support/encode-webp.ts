import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { WHATS_NEW_MEDIA } from '../models/whats-new-media.const';

/**
 * Writes the PNG screenshot as WebP: the best quality that keeps the file under the size budget
 * (down to the lowest quality). The image is always crop size times scale. Returns the size in bytes and the quality used.
 */
export async function encodeWebp(
  png: Buffer,
  webp: string,
): Promise<{ bytes: number; quality: number }> {
  const { best, lowest, step } = WHATS_NEW_MEDIA.quality;
  const { crop, scale } = WHATS_NEW_MEDIA;
  let quality: number = best;
  for (;;) {
    const data = await sharp(png)
      .resize(crop.width * scale, crop.height * scale)
      .webp({ quality, effort: 6 })
      .toBuffer();
    if (data.byteLength <= WHATS_NEW_MEDIA.maxBytes || quality - step < lowest) {
      await writeFile(webp, data);
      return { bytes: data.byteLength, quality };
    }
    quality -= step;
  }
}
