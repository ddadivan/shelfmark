import { LINKS_SCOPE } from '../models/links-scope.const';
import { LINKS_SCOPE_LABEL_KEY } from '../models/links-scope-label-key.const';
import { scopeLabelKey } from './scope-label-key';

describe('scopeLabelKey', () => {
  it('names the key of a scope', () => {
    expect(scopeLabelKey(LINKS_SCOPE.All)).toBe('library.scope.all');
    expect(scopeLabelKey(LINKS_SCOPE.Unsorted)).toBe('library.scope.unsorted');
    expect(scopeLabelKey(LINKS_SCOPE.Favorites)).toBe('library.scope.favorites');
    expect(scopeLabelKey(LINKS_SCOPE.Folder)).toBe('library.scope.folder');
  });

  it('has a ready-made key for templates per scope', () => {
    for (const scope of Object.values(LINKS_SCOPE)) {
      expect(LINKS_SCOPE_LABEL_KEY[scope]).toBe(scopeLabelKey(scope));
    }
  });
});
