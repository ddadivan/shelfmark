import { describe, expect, it } from 'vitest';
import { parseViewDraftOutput } from './parse-view-draft-output';
import { planMockViewDraft } from './plan-mock-view-draft';
import type { ViewDraftVocabulary } from './view-draft-vocabulary.interface';

const vocabulary: ViewDraftVocabulary = {
  folders: [
    { id: 'f-work', name: 'Work', path: 'Work' },
    { id: 'f-design', name: 'Design', path: 'Work / Design' },
    { id: 'f-clothes', name: 'Clothes', path: 'Clothes' },
  ],
  tags: ['Angular', 'signals', 'recipes', 'a', 'b', 'c'],
};

describe('parseViewDraftOutput', () => {
  it('refuses anything that is not an object', () => {
    expect(parseViewDraftOutput(null, vocabulary, 'x')).toBeNull();
    expect(parseViewDraftOutput([], vocabulary, 'x')).toBeNull();
    expect(parseViewDraftOutput('{}', vocabulary, 'x')).toBeNull();
  });

  it('keeps own folders and tags, maps them back by name and marks what was set', () => {
    const draft = parseViewDraftOutput(
      {
        scope: 'folder',
        folder: 'work / design',
        tags: ['angular', 'Signals'],
        kind: 'video',
        words: 'forms',
        sort: 'oldest',
        name: 'Angular talks',
        note: 'Watched state is not stored.',
      },
      vocabulary,
      'angular talks',
    );
    expect(draft).toEqual({
      query: {
        scope: 'folder',
        folderId: 'f-design',
        tags: ['Angular', 'signals'],
        kind: 'video',
        sort: 'createdAt',
        order: 'asc',
        q: 'forms',
      },
      set: ['scope', 'tags', 'kind', 'q', 'sort'],
      name: 'Angular talks',
      note: 'Watched state is not stored.',
      dropped: [],
    });
  });

  it('turns an unknown folder and unknown tags into search words, never creating them', () => {
    const draft = parseViewDraftOutput(
      { scope: 'folder', folder: 'Garden', tags: ['roses', 'recipes'], kind: 'other' },
      vocabulary,
      'garden roses',
    );
    expect(draft?.query).toMatchObject({
      scope: 'all',
      folderId: null,
      tags: ['recipes'],
      kind: null,
      q: 'Garden roses',
    });
    expect(draft?.set).toEqual(['tags', 'q']);
  });

  it('keeps at most five tags and five words; the rest is dropped and named', () => {
    const draft = parseViewDraftOutput(
      {
        tags: ['Angular', 'signals', 'recipes', 'a', 'b', 'c'],
        words: 'one two three four five six',
      },
      vocabulary,
      'many',
    );
    expect(draft?.query.tags).toEqual(['Angular', 'signals', 'recipes', 'a', 'b']);
    expect(draft?.query.q).toBe('one two three four five');
    expect(draft?.dropped).toEqual(['c', 'six']);
  });

  it('cleans text, falls back to the phrase for the name and ignores bad values', () => {
    const draft = parseViewDraftOutput(
      {
        scope: 'everything',
        sort: 'random',
        name: '  <b>\u0007</b> ',
        note: '   ',
        words: '<script>x</script>',
      },
      vocabulary,
      'a phrase that is far longer than forty characters in total',
    );
    expect(draft?.query.scope).toBe('all');
    expect(draft?.query.sort).toBe('createdAt');
    expect(draft?.name).toBe('a phrase that is far longer than forty c');
    expect(draft?.note).toBeNull();
    expect(draft?.query.q).toBe('x');
    expect(draft?.set).toEqual(['q']);
  });

  it('accepts a folder name with the all scope and unsorted or favorites as they are', () => {
    expect(parseViewDraftOutput({ folder: 'Clothes' }, vocabulary, 'x')?.query.folderId).toBe(
      'f-clothes',
    );
    expect(parseViewDraftOutput({ scope: 'favorites' }, vocabulary, 'x')?.query.scope).toBe(
      'favorites',
    );
    expect(parseViewDraftOutput({ scope: 'folder' }, vocabulary, 'x')?.query.scope).toBe('all');
  });
});

describe('planMockViewDraft', () => {
  const draft = (phrase: string) =>
    parseViewDraftOutput(planMockViewDraft(phrase, vocabulary), vocabulary, phrase);

  it('reads kind, tags and the note from the phrase', () => {
    const result = draft("angular videos I haven't watched");
    expect(result?.query).toMatchObject({ kind: 'video', tags: ['Angular'], scope: 'all' });
    expect(result?.note).not.toBeNull();
    expect(result?.name).toBe("Angular videos I haven't watched");
  });

  it('reads a folder, the sort, quoted words and unknown #tags', () => {
    const result = draft('what to buy in clothes, oldest first, "wool" #winter');
    expect(result?.query).toMatchObject({
      scope: 'folder',
      folderId: 'f-clothes',
      kind: 'shopping',
      order: 'asc',
      q: 'winter wool',
    });
  });

  it('reads Unsorted, Favorites and the title sort', () => {
    expect(draft('unsorted articles')?.query).toMatchObject({ scope: 'unsorted', kind: 'article' });
    expect(draft('my favorites a-z')?.query).toMatchObject({ scope: 'favorites', sort: 'title' });
    expect(draft('everything, newest')?.set).toEqual(['sort']);
  });
});
