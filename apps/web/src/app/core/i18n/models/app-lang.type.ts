import type { APP_LANG } from './app-lang.const';

/** One of `APP_LANG`. */
export type AppLang = (typeof APP_LANG)[keyof typeof APP_LANG];
