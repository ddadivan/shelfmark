import { normalizeTagName } from '@shelfmark/contracts';
import { Transform } from 'class-transformer';

/**
 * `?tag=a` arrives as a string and `?tag=a&tag=b` as an array: both become an array of normalized
 * names. Blank values are dropped and case-insensitive duplicates collapse (the first one wins).
 * Values that are not strings are kept so `@IsString({ each: true })` rejects them.
 */
export const NormalizeTagFilter = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    const list: unknown[] = Array.isArray(value) ? value : [value];
    const seen = new Set<string>();
    const names: unknown[] = [];
    for (const item of list) {
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
