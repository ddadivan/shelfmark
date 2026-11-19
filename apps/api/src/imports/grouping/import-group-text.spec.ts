import { IMPORT_LIMIT } from '@shelfmark/contracts';
import { importGroupCount } from './import-group-count';
import { importGroupText, importUrlLocation } from './import-group-text';
import { normalizeFolderKey } from './normalize-folder-key';

describe('importGroupText', () => {
  it('joins the title with host and path, never the query or fragment', () => {
    expect(
      importGroupText({ title: 'Signals', url: 'https://www.angular.dev/guide/signals?a=1#x' }),
    ).toBe('Signals angular.dev/guide/signals');
  });

  it('keeps at most the first two path segments', () => {
    expect(
      importGroupText({ title: 'Doc', url: 'https://example.com/a/b/private-doc-id/c?token=1' }),
    ).toBe('Doc example.com/a/b');
  });

  it('leaves the bare path out for a root URL and survives a broken URL', () => {
    expect(importGroupText({ title: 'Home', url: 'https://example.com/' })).toBe(
      'Home example.com',
    );
    expect(importGroupText({ title: 'x\u0000y', url: 'https://' })).toBe('x y');
    expect(importUrlLocation('nope')).toEqual({ host: '', path: '' });
  });

  it('cuts long text', () => {
    const text = importGroupText({
      title: 'a'.repeat(300),
      url: `https://e.com/${'b'.repeat(300)}`,
    });
    expect(Array.from(text)).toHaveLength(400);
  });
});

describe('importGroupCount', () => {
  it('is sqrt(n / 4) clamped between 2 and GroupsMax', () => {
    expect(importGroupCount(3)).toBe(2);
    expect(importGroupCount(100)).toBe(5);
    expect(importGroupCount(2_000)).toBe(IMPORT_LIMIT.GroupsMax);
  });
});

describe('normalizeFolderKey', () => {
  it('ignores case, accents and repeated spaces', () => {
    expect(normalizeFolderKey('  Café   RECETTES ')).toBe('cafe recettes');
  });
});
