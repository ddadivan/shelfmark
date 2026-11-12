import { FLAG_CODE, type FlagCode } from '@shelfmark/ui';
import type { AppLang } from '../../../../../core/i18n/models/app-lang.type';

/**
 * The flag next to each interface language (#315): the UK for English, Brazil for Portuguese
 * (the translation is Brazilian), the country of the language for the rest.
 */
export const LANGUAGE_FLAGS: Readonly<Record<AppLang, FlagCode>> = {
  en: FLAG_CODE.Gb,
  fr: FLAG_CODE.Fr,
  de: FLAG_CODE.De,
  it: FLAG_CODE.It,
  es: FLAG_CODE.Es,
  pt: FLAG_CODE.Br,
};
