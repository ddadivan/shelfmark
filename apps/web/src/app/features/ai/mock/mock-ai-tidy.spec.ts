import { Injector, runInInjectionContext } from '@angular/core';
import {
  LINK_LIMIT,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  type LinkSuggestion,
  type SuggestionKind,
} from '@shelfmark/contracts';
import { MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockAiData } from './mock-ai-data';
import { MockAiTidy } from './mock-ai-tidy';

function row(
  id: string,
  kind: SuggestionKind,
  name: string | null,
  folderId: string | null = null,
) {
  return {
    id,
    kind,
    state: SUGGESTION_STATE.Suggested,
    tagName: name,
    folderId,
  } satisfies LinkSuggestion;
}

function setup(enabled = true) {
  const injector = Injector.create({ providers: [MockLibraryData, MockAiData, MockAiTidy] });
  const ai = injector.get(MockAiData);
  ai.updateSettings({ enabled });
  const library = injector.get(MockLibraryData);
  // The pasta link is in Unsorted and has the tag "recipes".
  ai.setSuggestions(MOCK_ID.LinkPasta, [
    row('s1', SUGGESTION_KIND.Folder, null, MOCK_ID.FolderReading),
    row('s2', SUGGESTION_KIND.Tag, MOCK_NAME.TagDocs),
    row('s3', SUGGESTION_KIND.NewTag, 'pasta'),
    row('s4', SUGGESTION_KIND.Tag, 'Recipes'),
    row('s5', SUGGESTION_KIND.NewTag, 'DOCS'),
  ]);
  return {
    tidy: runInInjectionContext(injector, () => injector.get(MockAiTidy)),
    ai,
    library,
    pasta: () => library.links.find((link) => link.id === MOCK_ID.LinkPasta),
  };
}

describe('MockAiTidy', () => {
  afterEach(() => localStorage.clear());

  it('lists links in Unsorted with filtered suggestions, nothing while AI is off', () => {
    const { tidy } = setup();
    const list = tidy.list();
    expect(list.total).toBe(1);
    expect(tidy.count()).toBe(1);
    const [item] = list.items;
    expect(item?.link.id).toBe(MOCK_ID.LinkPasta);
    // The tag already on the link is left out; a new tag whose name exists reads as a tag.
    expect(item?.suggestions.map((s) => [s.id, s.kind])).toEqual([
      ['s1', SUGGESTION_KIND.Folder],
      ['s2', SUGGESTION_KIND.Tag],
      ['s3', SUGGESTION_KIND.NewTag],
      ['s5', SUGGESTION_KIND.Tag],
    ]);

    expect(setup(false).tidy.list()).toEqual({ items: [], total: 0 });
  });

  it('hides the folder chip when a rule with a live folder decides the folder', () => {
    const { tidy, library } = setup();
    library.rules = [
      {
        id: 'r1',
        domain: 'example.com',
        folderId: MOCK_ID.FolderAngular,
        tags: [],
        createdAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    expect(tidy.list().items[0]?.suggestions.map((s) => s.id)).toEqual(['s2', 's3', 's5']);
  });

  it('applies the selected rows, leaves the others, and undoes the run exactly', () => {
    const { tidy, ai, library, pasta } = setup();
    const response = tidy.apply({
      items: [{ linkId: MOCK_ID.LinkPasta, suggestionIds: ['s1', 's3', 'foreign'] }],
    });
    expect(response).toMatchObject({ applied: 1, folders: 1, tagsAdded: 1, skipped: 0 });
    expect(pasta()?.folderId).toBe(MOCK_ID.FolderReading);
    expect(pasta()?.tags).toEqual(['pasta', 'recipes']);
    expect(library.tagList.some((tag) => tag.name === 'pasta')).toBe(true);
    expect(ai.suggestionsOf(MOCK_ID.LinkPasta).map((s) => s.id)).toEqual(['s2', 's4', 's5']);
    expect(response?.undo).toEqual({
      items: [
        {
          linkId: MOCK_ID.LinkPasta,
          folderId: MOCK_ID.FolderReading,
          tags: ['pasta'],
          suggestionIds: ['s1', 's3'],
        },
      ],
    });
    expect(tidy.count()).toBe(0);

    const undone = tidy.undo(response?.undo ?? { items: [] });
    expect(undone.links).toHaveLength(1);
    expect(pasta()?.folderId).toBeNull();
    expect(pasta()?.tags).toEqual(['recipes']);
    expect(tidy.list().items[0]?.suggestions.map((s) => s.id)).toEqual(['s2', 's5', 's1', 's3']);
  });

  it('never replaces a folder chosen meanwhile and leaves a later change alone on undo', () => {
    const { tidy, library, pasta } = setup();
    const response = tidy.apply({
      items: [{ linkId: MOCK_ID.LinkPasta, suggestionIds: ['s1', 's2'] }],
    });
    library.links = library.links.map((link) =>
      link.id === MOCK_ID.LinkPasta ? { ...link, folderId: MOCK_ID.FolderAngular } : link,
    );
    tidy.undo(response?.undo ?? { items: [] });
    expect(pasta()?.folderId).toBe(MOCK_ID.FolderAngular);
    expect(pasta()?.tags).toEqual(['recipes']);
  });

  it('counts tags past the limit as skipped and refuses while AI is off', () => {
    const { tidy, library, pasta } = setup();
    const full = Array.from({ length: LINK_LIMIT.TagsMax }, (_, i) => `t${i}`);
    library.links = library.links.map((link) =>
      link.id === MOCK_ID.LinkPasta ? { ...link, tags: full } : link,
    );
    const response = tidy.apply({
      items: [{ linkId: MOCK_ID.LinkPasta, suggestionIds: ['s1', 's2', 's3'] }],
    });
    expect(response).toMatchObject({ applied: 1, folders: 1, tagsAdded: 0, skipped: 2 });
    expect(pasta()?.tags).toHaveLength(LINK_LIMIT.TagsMax);

    expect(
      setup(false).tidy.apply({ items: [{ linkId: MOCK_ID.LinkPasta, suggestionIds: ['s1'] }] }),
    ).toBeNull();
  });

  it('leaves a tag already on the link (or picked twice) suggested and does not count it', () => {
    const { tidy, ai, pasta } = setup();
    const response = tidy.apply({
      items: [{ linkId: MOCK_ID.LinkPasta, suggestionIds: ['s2', 's4', 's5'] }],
    });
    expect(response).toMatchObject({ applied: 1, folders: 0, tagsAdded: 1 });
    expect(response?.undo.items[0]?.suggestionIds).toEqual(['s2']);
    expect(pasta()?.tags).toHaveLength(2);
    expect(ai.suggestionsOf(MOCK_ID.LinkPasta).map((s) => s.id)).toEqual(['s1', 's3', 's4', 's5']);
  });

  it('reads the page after a given link, like the API', () => {
    const { tidy } = setup();
    expect(tidy.list(MOCK_ID.LinkPasta)).toEqual({ items: [], total: 0 });
    expect(tidy.list('unknown').total).toBe(1);
  });
});
