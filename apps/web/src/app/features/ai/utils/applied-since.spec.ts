import { appliedSince } from './applied-since';

describe('appliedSince', () => {
  const saved = { folderId: 'f1', tags: ['Angular'] };

  it('is null when AI applied nothing', () => {
    expect(appliedSince(saved, null)).toBeNull();
  });

  it('drops what the saved link already shows', () => {
    expect(appliedSince(saved, { folderId: 'f1', tags: ['angular'] })).toBeNull();
  });

  it('keeps a new folder and only the new tags', () => {
    expect(appliedSince(saved, { folderId: 'f2', tags: ['angular', 'signals'] })).toEqual({
      folderId: 'f2',
      tags: ['signals'],
    });
    expect(appliedSince(saved, { folderId: 'f1', tags: ['signals'] })).toEqual({
      folderId: null,
      tags: ['signals'],
    });
  });
});
