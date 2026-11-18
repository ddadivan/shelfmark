import { draftSuggestionId } from './draft-suggestion-id';
import { toStoredLinkResult } from './to-stored-link-result';

describe('toStoredLinkResult', () => {
  it('reads the shape the runner wrote', () => {
    expect(
      toStoredLinkResult({
        tags: ['a', 3, 'b'],
        newTag: 'n',
        folderId: 'f',
        summary: 's',
        title: 't',
      }),
    ).toEqual({ tags: ['a', 'b'], newTag: 'n', folderId: 'f', summary: 's', title: 't' });
  });

  it('turns blank or missing fields into null', () => {
    expect(toStoredLinkResult({ tags: [], newTag: '', summary: 5 })).toEqual({
      tags: [],
      newTag: null,
      folderId: null,
      summary: null,
      title: null,
    });
  });

  it('refuses anything else', () => {
    for (const value of [null, 'x', [], { tags: 'a' }]) {
      expect(toStoredLinkResult(value)).toBeNull();
    }
  });
});

describe('draftSuggestionId', () => {
  it('is a stable UUID-shaped id per job, kind and target', () => {
    const id = draftSuggestionId('job', 'tag', 'design');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(draftSuggestionId('job', 'tag', 'design')).toBe(id);
    expect(draftSuggestionId('job', 'new-tag', 'design')).not.toBe(id);
    expect(draftSuggestionId('other', 'tag', 'design')).not.toBe(id);
  });
});
