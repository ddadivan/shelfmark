import {
  AI_FEATURE_MODE,
  AI_SUMMARY_LANGUAGE_APP,
  INTERFACE_LANGUAGE,
  type AiFeatureMode,
  type AiSummaryLanguage,
} from '@shelfmark/contracts';

/** Whether `value` is one of `AI_FEATURE_MODE` (a control or stored value). */
export function isAiFeatureMode(value: unknown): value is AiFeatureMode {
  return Object.values<unknown>(AI_FEATURE_MODE).includes(value);
}

/** Whether `value` is a summary language: `app` or a shipped language ("Match my browser" is not). */
export function isAiSummaryLanguage(value: unknown): value is AiSummaryLanguage {
  return (
    value === AI_SUMMARY_LANGUAGE_APP ||
    (value !== INTERFACE_LANGUAGE.Browser &&
      Object.values<unknown>(INTERFACE_LANGUAGE).includes(value))
  );
}
