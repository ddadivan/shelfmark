import { EXPORT_FORMAT } from '@shelfmark/contracts';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { buildExportUrl, exportScopeOf } from './export-url';

const FOLDER = '3f0c1d52-8a3b-4d6e-9d57-0a5f2a1b9c11';

describe('exportScopeOf', () => {
  it('has no scope for the whole library', () => {
    expect(exportScopeOf({ scope: LINKS_SCOPE.All })).toBeUndefined();
    expect(exportScopeOf({ scope: LINKS_SCOPE.All, tags: [] })).toBeUndefined();
  });

  it('maps a folder to folderId', () => {
    expect(exportScopeOf({ scope: LINKS_SCOPE.Folder, folderId: FOLDER })).toEqual({
      folderId: FOLDER,
    });
  });

  it('maps tags and search, with or without a folder', () => {
    expect(exportScopeOf({ scope: LINKS_SCOPE.All, tags: ['a', 'b'], q: 'x' })).toEqual({
      tags: ['a', 'b'],
      q: 'x',
    });
    expect(exportScopeOf({ scope: LINKS_SCOPE.Folder, folderId: FOLDER, tags: ['a'] })).toEqual({
      folderId: FOLDER,
      tags: ['a'],
    });
  });

  it('has no equivalent for unsorted and favorites', () => {
    expect(exportScopeOf({ scope: LINKS_SCOPE.Unsorted })).toBeUndefined();
    expect(exportScopeOf({ scope: LINKS_SCOPE.Favorites, tags: ['a'] })).toBeUndefined();
  });
});

describe('buildExportUrl', () => {
  it('is just the format for everything', () => {
    expect(buildExportUrl('/api', EXPORT_FORMAT.Json, {})).toBe('/api/export?format=json');
    expect(buildExportUrl('/api', EXPORT_FORMAT.Html, {})).toBe('/api/export?format=html');
  });

  it('adds the folder', () => {
    expect(buildExportUrl('/api', EXPORT_FORMAT.Json, { folderId: FOLDER })).toBe(
      `/api/export?format=json&folderId=${FOLDER}`,
    );
  });

  it('repeats the tag parameter', () => {
    expect(buildExportUrl('/api', EXPORT_FORMAT.Json, { tags: ['a', 'b'] })).toBe(
      '/api/export?format=json&tag=a&tag=b',
    );
  });

  it('encodes tags and search text', () => {
    const url = buildExportUrl('/api', EXPORT_FORMAT.Html, {
      tags: ['c++ & more', 'ünï'],
      q: 'a=b&c d#e',
    });

    expect(url).toBe(
      '/api/export?format=html&tag=c%2B%2B+%26+more&tag=%C3%BCn%C3%AF&q=a%3Db%26c+d%23e',
    );
    const parsed = new URL(url, 'http://localhost');
    expect(parsed.searchParams.getAll('tag')).toEqual(['c++ & more', 'ünï']);
    expect(parsed.searchParams.get('q')).toBe('a=b&c d#e');
  });

  it('combines every part and skips an empty search', () => {
    expect(
      buildExportUrl('/api', EXPORT_FORMAT.Json, { folderId: FOLDER, tags: ['t'], q: '' }),
    ).toBe(`/api/export?format=json&folderId=${FOLDER}&tag=t`);
  });
});
