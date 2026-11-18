import { MOCK_ASK } from '../models/mock-ask.const';
import { MOCK_ASK_THEMES } from '../models/mock-ask-themes.const';
import type { AskInput } from '../models/ask-input.interface';
import type { AskPromptSource } from '../models/ask-prompt-source.interface';

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u));
}

function shortTitle(source: AskPromptSource): string {
  const title = Array.from(source.title.trim()).slice(0, MOCK_ASK.TitleMax).join('');
  return title === '' ? source.host : title;
}

/**
 * The mock's answer text with `[n]` markers (deterministic): a canned answer for a demo seed theme
 * citing the matching sources, "not in your links" without citations for the `sourdough` trigger,
 * else a template over the first sources. Titles are echoed as they are, so a hostile title reaches
 * the citation stream like a hostile model answer would.
 */
export function mockAskAnswer(input: AskInput): string {
  const question = input.question.toLowerCase();
  if (question.includes(MOCK_ASK.NotFoundMarker)) {
    return 'None of your saved links explain this, so there is nothing to cite.';
  }
  const asked = words(question);
  for (const theme of MOCK_ASK_THEMES) {
    if (!theme.triggers.some((trigger) => asked.has(trigger))) continue;
    const matching = input.sources.filter((source) => {
      const own = words(`${source.title} ${source.tagNames.join(' ')} ${source.summary ?? ''}`);
      return theme.sourceWords.some((word) => own.has(word));
    });
    if (matching.length === 0) break;
    const lines = matching
      .slice(0, theme.lines.length)
      .map(
        (source, index) =>
          `${(theme.lines[index] ?? '').replace('{title}', shortTitle(source))} [${source.n}]`,
      );
    return [theme.intro, ...lines].join(' ');
  }
  const picked = input.sources.slice(0, MOCK_ASK.TemplateSourcesMax);
  const count = input.sources.length;
  const lines = picked.map((source, index) =>
    index === 0
      ? `${shortTitle(source)} looks closest [${source.n}].`
      : `${shortTitle(source)} is related [${source.n}].`,
  );
  return [`You saved ${count} ${count === 1 ? 'link' : 'links'} about this.`, ...lines].join(' ');
}

/** The answer split into word chunks, each with its following whitespace. */
export function mockAskChunks(answer: string): string[] {
  return answer.match(/\S+\s*/gu) ?? [];
}
