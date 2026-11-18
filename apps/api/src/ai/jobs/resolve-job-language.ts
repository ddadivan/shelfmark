import {
  AI_SUMMARY_LANGUAGE_APP,
  INTERFACE_LANGUAGE,
  type AiSummaryLanguage,
} from '@shelfmark/contracts';
import { AI_SUMMARY_LANGUAGES } from '../models/ai-summary-languages.const';

const CONCRETE: readonly string[] = AI_SUMMARY_LANGUAGES.filter(
  (value) => value !== AI_SUMMARY_LANGUAGE_APP,
);

/** The supported languages of an `Accept-Language` header, most preferred first. */
function fromAcceptLanguage(header: string): string | null {
  const ranked = header
    .split(',')
    .slice(0, 20)
    .map((entry, index) => {
      const [tag = '', ...params] = entry.trim().split(';');
      const q = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
      const weight = q === undefined ? 1 : Number.parseFloat(q.slice(2));
      return {
        code: tag.trim().split('-')[0]?.toLowerCase() ?? '',
        weight: Number.isFinite(weight) ? weight : 0,
        index,
      };
    })
    .filter((entry) => entry.weight > 0 && CONCRETE.includes(entry.code))
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  return ranked[0]?.code ?? null;
}

/**
 * The language a job writes its summary in: the explicit setting, else the user's interface
 * language, else the first supported language of the saving request, else English.
 */
export function resolveJobLanguage(
  summaryLanguage: AiSummaryLanguage,
  userLanguage: string,
  acceptLanguage: string | undefined,
): string {
  if (summaryLanguage !== AI_SUMMARY_LANGUAGE_APP) return summaryLanguage;
  if (userLanguage !== INTERFACE_LANGUAGE.Browser && CONCRETE.includes(userLanguage)) {
    return userLanguage;
  }
  return (acceptLanguage && fromAcceptLanguage(acceptLanguage)) || INTERFACE_LANGUAGE.En;
}
