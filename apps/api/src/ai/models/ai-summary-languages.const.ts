import {
  AI_SUMMARY_LANGUAGE_APP,
  INTERFACE_LANGUAGE,
  type AiSummaryLanguage,
} from '@shelfmark/contracts';

/** `app` or a shipped translation (never `browser`). */
export const AI_SUMMARY_LANGUAGES: readonly AiSummaryLanguage[] = [
  AI_SUMMARY_LANGUAGE_APP,
  ...Object.values(INTERFACE_LANGUAGE).filter(
    (value): value is Exclude<typeof value, typeof INTERFACE_LANGUAGE.Browser> =>
      value !== INTERFACE_LANGUAGE.Browser,
  ),
];
