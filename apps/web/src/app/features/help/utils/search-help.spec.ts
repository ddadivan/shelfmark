import { describe, expect, it } from 'vitest';
import en from '../../../core/i18n/en.json';
import { foldHelpText, helpQueryWords, searchHelp, type HelpTextReader } from './search-help';

type Tree = { readonly [key: string]: string | Tree };

function lookup(root: Tree, path: readonly string[]): string {
  let node: string | Tree | undefined = root;
  for (const part of path) {
    node = typeof node === 'object' ? node[part] : undefined;
  }
  return typeof node === 'string' ? node : '';
}

const read: HelpTextReader = (id, key) => lookup(en.help.articles as Tree, [id, ...key.split('.')]);

describe('searchHelp', () => {
  it('finds nothing for a blank query', () => {
    expect(searchHelp('   ', read)).toEqual([]);
  });

  it('ranks a title hit first and shows a snippet that holds the word', () => {
    const results = searchHelp('remind', read);
    expect(results[0]?.article.id).toBe('reminders');
    expect(results.length).toBeGreaterThan(2);
    expect(results.every((result) => result.snippet.length > 0)).toBe(true);
  });

  it('needs every word, in any order', () => {
    expect(searchHelp('rule folder', read).map((r) => r.article.id)).toContain('rules');
    expect(searchHelp('zzzz-nothing', read)).toEqual([]);
  });

  it('ignores case and accents', () => {
    expect(foldHelpText('Réminder')).toBe('reminder');
    expect(searchHelp('REMINDERS', read)[0]?.article.id).toBe('reminders');
    expect(helpQueryWords('  Foo   BAR ')).toEqual(['foo', 'bar']);
  });
});
