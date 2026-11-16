import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import italian from './it.json';
import { EXT_LANG } from './models/ext-lang.const';
import type { ExtLang } from './models/ext-lang.type';
import pt from './pt.json';
import uk from './uk.json';

/** Every language file has exactly the keys of `en.json` (the source) and the same placeholders. */

type Tree = { readonly [key: string]: string | Tree };

const FILES: Readonly<Record<ExtLang, Tree>> = { en, fr, de, it: italian, es, pt, uk };

function collect(node: Tree, path = '', out = new Map<string, string>()): Map<string, string> {
  for (const [key, value] of Object.entries(node)) {
    const at = path ? `${path}.${key}` : key;
    if (typeof value === 'string') out.set(at, value);
    else collect(value, at, out);
  }
  return out;
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}|\{(\w+)\}/g)]
    .map((match) => match[0].replace(/\s/g, ''))
    .sort();
}

const source = collect(en);

describe('translation files', () => {
  it('ships one file per language', () => {
    expect(Object.keys(FILES).sort()).toEqual(Object.values(EXT_LANG).sort());
  });

  describe.each(Object.values(EXT_LANG))('%s', (lang) => {
    const target = collect(FILES[lang]);

    it('has exactly the keys of en.json', () => {
      expect([...target.keys()].sort()).toEqual([...source.keys()].sort());
    });

    it('has no empty strings', () => {
      const empty = [...target].filter(([, value]) => value.trim() === '').map(([key]) => key);
      expect(empty).toEqual([]);
    });

    it('keeps every placeholder', () => {
      const wrong = [...source]
        .filter(([key, text]) => {
          const translated = target.get(key);
          return (
            translated !== undefined &&
            placeholders(translated).join() !== placeholders(text).join()
          );
        })
        .map(([key]) => key);
      expect(wrong).toEqual([]);
    });
  });
});
