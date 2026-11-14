import { LINK_LIMIT } from '@shelfmark/contracts';

/**
 * A preview title cut to `LINK_LIMIT.TitleMax` UTF-16 units (what the API's `MaxLength` counts),
 * never inside a surrogate pair, then trimmed.
 */
export function fitTitle(title: string): string {
  let fitted = '';
  for (const char of title.trim()) {
    if (fitted.length + char.length > LINK_LIMIT.TitleMax) {
      break;
    }
    fitted += char;
  }
  return fitted.trim();
}
