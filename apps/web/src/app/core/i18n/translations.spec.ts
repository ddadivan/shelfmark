import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import italian from './it.json';
import pt from './pt.json';
import { APP_LANG } from './models/app-lang.const';
import type { AppLang } from './models/app-lang.type';
import { pluralCategories } from './plural-key';

/**
 * Every language file has exactly the keys of `en.json` (the source), the same placeholders, and
 * for each plural key exactly the plural categories its language needs (`Intl.PluralRules`), so
 * `pluralKey` never asks for a missing key. Add a key to every language file when you add it to
 * `en.json`.
 */

type Tree = { readonly [key: string]: string | Tree };

const FILES: Readonly<Record<AppLang, Tree>> = { en, fr, de, it: italian, es, pt };
const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

function isPluralGroup(node: Tree): boolean {
  const keys = Object.keys(node);
  return (
    keys.includes('other') &&
    keys.every((key) => PLURAL_CATEGORIES.has(key) && typeof node[key] === 'string')
  );
}

/** `path → string` for plain keys and `path → { category → string }` for plural groups. */
function collect(
  node: Tree,
  path = '',
  plain = new Map<string, string>(),
  plurals = new Map<string, Record<string, string>>(),
): { plain: Map<string, string>; plurals: Map<string, Record<string, string>> } {
  for (const [key, value] of Object.entries(node)) {
    const at = path ? `${path}.${key}` : key;
    if (typeof value === 'string') {
      plain.set(at, value);
    } else if (isPluralGroup(value)) {
      plurals.set(at, value as Record<string, string>);
    } else {
      collect(value, at, plain, plurals);
    }
  }
  return { plain, plurals };
}

/** `{{name}}` (Transloco) and `{name}` (filled in by `libs/ui` components), whitespace ignored. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}|\{(\w+)\}/g)]
    .map((match) => match[0].replace(/\s/g, ''))
    .sort();
}

const source = collect(en);

describe('translation files', () => {
  it('ships one file per language', () => {
    expect(Object.keys(FILES).sort()).toEqual(Object.values(APP_LANG).sort());
  });

  describe.each(Object.values(APP_LANG))('%s', (lang) => {
    const target = collect(FILES[lang]);

    it('has exactly the keys of en.json', () => {
      expect([...target.plain.keys()].sort()).toEqual([...source.plain.keys()].sort());
      expect([...target.plurals.keys()].sort()).toEqual([...source.plurals.keys()].sort());
    });

    it('has no empty strings', () => {
      const empty = [...target.plain].filter(([, value]) => value.trim() === '').map(([k]) => k);
      expect(empty).toEqual([]);
    });

    it('keeps every placeholder of a plain key', () => {
      const wrong = [...source.plain]
        .filter(([key, text]) => {
          const translated = target.plain.get(key);
          return (
            translated !== undefined &&
            placeholders(translated).join() !== placeholders(text).join()
          );
        })
        .map(([key]) => key);
      expect(wrong).toEqual([]);
    });

    it('has exactly the plural categories the language needs, with valid placeholders', () => {
      const needed = [...pluralCategories(lang)].sort();
      const problems: string[] = [];
      for (const [key, group] of source.plurals) {
        const translated = target.plurals.get(key);
        if (!translated) {
          continue; // reported by the key test
        }
        if (Object.keys(translated).sort().join() !== needed.join()) {
          problems.push(`${key}: ${Object.keys(translated).join()} (needs ${needed.join()})`);
        }
        const allowed = new Set(Object.values(group).flatMap(placeholders));
        for (const [category, text] of Object.entries(translated)) {
          for (const placeholder of placeholders(text)) {
            if (!allowed.has(placeholder)) {
              problems.push(`${key}.${category}: unknown ${placeholder}`);
            }
          }
        }
        for (const placeholder of placeholders(group['other'] ?? '')) {
          if (!placeholders(translated['other'] ?? '').includes(placeholder)) {
            problems.push(`${key}.other: missing ${placeholder}`);
          }
        }
      }
      expect(problems).toEqual([]);
    });
  });
});
