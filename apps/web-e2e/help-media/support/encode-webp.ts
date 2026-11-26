import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { HELP_MEDIA } from '../models/help-media.const';

/**
 * Writes the PNG screenshot as WebP: the best quality that keeps the file under the size budget
 * (down to the lowest quality). Returns the size in bytes and the quality used.
 */
export async function encodeWebp(
  png: Buffer,
  webp: string,
): Promise<{ bytes: number; quality: number }> {
  const { best, lowest, step } = HELP_MEDIA.quality;
  let quality: number = best;
  for (;;) {
    const data = await sharp(png)
      .resize(HELP_MEDIA.width, HELP_MEDIA.height)
      .webp({ quality, effort: 6 })
      .toBuffer();
    if (data.byteLength <= HELP_MEDIA.maxBytes || quality - step < lowest) {
      await writeFile(webp, data);
      return { bytes: data.byteLength, quality };
    }
    quality -= step;
  }
}
