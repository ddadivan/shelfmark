import type { EXT_LANG } from './ext-lang.const';

export type ExtLang = (typeof EXT_LANG)[keyof typeof EXT_LANG];
