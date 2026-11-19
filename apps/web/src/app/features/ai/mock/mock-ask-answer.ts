import type { MockAskSource } from './models/mock-ask-source.interface';
import { MOCK_ASK } from './models/mock-ask.const';
import { MOCK_ASK_THEMES } from './models/mock-ask-themes.const';

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u));
}

function shortTitle(source: MockAskSource): string {
  const title = source.title.trim();
  return title === '' ? source.host : title;
}

/**
 * The mock's answer text with `[n]` markers, like the API mock (`mock-ask-answer.ts`): a canned
 * answer for a demo seed theme citing the matching sources, "not in your links" without citations
 * for `sourdough`, else a template over the first sources.
 */
export function mockAskAnswer(question: string, sources: readonly MockAskSource[]): string {
  const lower = question.toLowerCase();
  if (lower.includes(MOCK_ASK.NotFoundMarker)) {
    return 'None of your saved links explain this, so there is nothing to cite.';
  }
  const asked = words(lower);
  for (const theme of MOCK_ASK_THEMES) {
    if (!theme.triggers.some((trigger) => asked.has(trigger))) {
      continue;
    }
    const matching = sources.filter((source) => {
      const own = words(`${source.title} ${source.tags.join(' ')} ${source.summary ?? ''}`);
      return theme.sourceWords.some((word) => own.has(word));
    });
    if (matching.length === 0) {
      break;
    }
    const lines = matching
      .slice(0, theme.lines.length)
      .map(
        (source, index) =>
          `${(theme.lines[index] ?? '').replace('{title}', shortTitle(source))} [${source.n}]`,
      );
    return [theme.intro, ...lines].join(' ');
  }
  const picked = sources.slice(0, MOCK_ASK.TemplateSourcesMax);
  const count = sources.length;
  const lines = picked.map((source, index) =>
    index === 0
      ? `${shortTitle(source)} looks closest [${source.n}].`
      : `${shortTitle(source)} is related [${source.n}].`,
  );
  return [`You saved ${count} ${count === 1 ? 'link' : 'links'} about this.`, ...lines].join(' ');
}
