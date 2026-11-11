import { normalizeTagName } from '@shelfmark/contracts';
import { Transform } from 'class-transformer';

/**
 * A JSON body's tag list: an array of names becomes the normalized names (blank ones dropped,
 * case-insensitive duplicates collapsed, the first wins). Anything else, including a bare string, is
 * kept as it is so `@IsArray` / `@IsString({ each: true })` reject it: the body is strict, unlike the
 * `?tag=` query parameter.
 */
export const NormalizeTagList = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (!Array.isArray(value)) return value;
    const seen = new Set<string>();
    const names: unknown[] = [];
    for (const item of value) {
      if (typeof item !== 'string') {
        names.push(item);
        continue;
      }
      const name = normalizeTagName(item);
      const key = name.toLowerCase();
      if (name === '' || seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
    return names;
  });
