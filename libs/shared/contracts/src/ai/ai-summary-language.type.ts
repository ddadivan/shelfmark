import type { InterfaceLanguage } from '../users/interface-language.type';
import type { INTERFACE_LANGUAGE } from '../users/interface-language.const';
import type { AI_SUMMARY_LANGUAGE_APP } from './ai-summary-language-app.const';

/**
 * Language AI writes summaries in: `app` follows the interface language (the API resolves "Match my
 * browser" from the saving request), or one of the shipped translations whatever the page is in.
 */
export type AiSummaryLanguage =
  typeof AI_SUMMARY_LANGUAGE_APP | Exclude<InterfaceLanguage, typeof INTERFACE_LANGUAGE.Browser>;
