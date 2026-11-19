import { FOLDER_LIMIT } from '@shelfmark/contracts';

/** Words of a title that never name a topic (URL pieces, filler). */
const STOP_WORDS: ReadonlySet<string> = new Set([
  'http',
  'https',
  'www',
  'html',
  'htm',
  'com',
  'org',
  'net',
  'page',
  'home',
  'index',
  'with',
  'from',
  'that',
  'this',
  'your',
  'what',
  'about',
  'the',
  'and',
  'for',
]);
const MIN_WORD = 4;
const DEFAULT_NAME = 'Links';

function capitalise(word: string): string {
  const [first = '', ...rest] = Array.from(word);
  return `${first.toUpperCase()}${rest.join('')}`;
}

/** Most frequent first; ties alphabetical, so the answer never depends on the input order. */
function ranked(values: readonly string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'en'));
}

/** `news.example.co.uk` → `example`; a bare host stays; at most the last two labels count. */
function siteLabel(host: string): string {
  const labels = host
    .replace(/^www\./u, '')
    .split('.')
    .filter((label) => label !== '');
  return labels.length >= 2 ? (labels[labels.length - 2] ?? '') : (labels[0] ?? '');
}

/**
 * A folder name for a cluster when the model gave none (and the mock's answer): the title word that
 * most titles share (at least two), else the most frequent site, else the most frequent title word,
 * else "Links". Deterministic, at most `FOLDER_LIMIT.NameMax` characters.
 */
export function fallbackImportGroupName(
  titles: readonly string[],
  hosts: readonly string[],
): string {
  const words = titles.flatMap((title) => [
    ...new Set(
      (title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
        (word) =>
          Array.from(word).length >= MIN_WORD && !STOP_WORDS.has(word) && !/^\d+$/u.test(word),
      ),
    ),
  ]);
  const topWords = ranked(words);
  const shared = topWords.find((entry) => entry.count >= 2);
  const site = ranked(hosts.map((host) => siteLabel(host)).filter((label) => label !== ''))[0];
  const pick = shared?.value ?? site?.value ?? topWords[0]?.value ?? DEFAULT_NAME;
  return Array.from(capitalise(pick)).slice(0, FOLDER_LIMIT.NameMax).join('');
}
