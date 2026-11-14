import type { INTERFACE_LANGUAGE } from './interface-language.const';

/** One of `INTERFACE_LANGUAGE`. */
export type InterfaceLanguage = (typeof INTERFACE_LANGUAGE)[keyof typeof INTERFACE_LANGUAGE];
