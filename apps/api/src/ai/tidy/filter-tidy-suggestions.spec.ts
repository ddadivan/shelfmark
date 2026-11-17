import { filterTidySuggestions } from './filter-tidy-suggestions';
import type { TidyFilterContext } from '../models/tidy-filter-context.interface';

const base: TidyFilterContext = {
  liveFolderIds: new Set(['f-live']),
  tagKeys: new Set(['css', 'design']),
  linkTagKeys: new Set(['design']),
  ruleDecidesFolder: false,
};

const folder = (folderId: string | null, id = 's-folder') => ({
  id,
  kind: 'folder',
  tagName: null,
  folderId,
});
const tag = (tagName: string | null, kind = 'tag', id = `s-${tagName ?? 'x'}`) => ({
  id,
  kind,
  tagName,
  folderId: null,
});

describe('filterTidySuggestions', () => {
  it('keeps a live folder and tags not on the link, in order', () => {
    expect(filterTidySuggestions([folder('f-live'), tag('css')], base)).toEqual([
      { id: 's-folder', kind: 'folder', state: 'suggested', tagName: null, folderId: 'f-live' },
      { id: 's-css', kind: 'tag', state: 'suggested', tagName: 'css', folderId: null },
    ]);
  });

  it('drops a trashed or gone folder and a folder without id', () => {
    expect(filterTidySuggestions([folder('f-trashed'), folder(null)], base)).toEqual([]);
  });

  it('hides the folder when a rule with a live folder decides it, but keeps the tags', () => {
    const out = filterTidySuggestions([folder('f-live'), tag('css')], {
      ...base,
      ruleDecidesFolder: true,
    });
    expect(out.map((s) => s.id)).toEqual(['s-css']);
  });

  it('drops a tag already on the link, ignoring case', () => {
    expect(filterTidySuggestions([tag('Design')], base)).toEqual([]);
  });

  it('reads a new tag whose name exists now as a tag, and keeps a real new one', () => {
    const out = filterTidySuggestions([tag('CSS', 'new-tag'), tag('fresh', 'new-tag')], base);
    expect(out.map((s) => [s.tagName, s.kind])).toEqual([
      ['CSS', 'tag'],
      ['fresh', 'new-tag'],
    ]);
  });

  it('skips unknown kinds and tag rows without a name', () => {
    expect(filterTidySuggestions([tag(null), tag('x', 'other')], base)).toEqual([]);
  });
});
