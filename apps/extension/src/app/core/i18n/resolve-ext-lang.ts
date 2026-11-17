import { EXT_LANG } from './models/ext-lang.const';
import type { ExtLang } from './models/ext-lang.type';

const LANGS: readonly string[] = Object.values(EXT_LANG);

function isExtLang(value: string): value is ExtLang {
  return LANGS.includes(value);
}

/**
 * The popup's language: the first browser language it has, else English. The popup cannot read the
 * app's own language setting (another origin's storage), so it follows the browser.
 */
export function resolveExtLang(browserLangs: readonly string[]): ExtLang {
  for (const tag of browserLangs) {
    const base = tag.split(/[-_]/u)[0]?.toLowerCase() ?? '';
    if (isExtLang(base)) return base;
  }
  return EXT_LANG.En;
}
