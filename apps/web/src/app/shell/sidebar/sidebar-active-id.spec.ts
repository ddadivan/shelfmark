import { sidebarActiveId } from './sidebar-active-id';

describe('sidebarActiveId', () => {
  it.each([
    ['/links', 'all'],
    ['/links?tag=a&tag=b', 'all'],
    ['/unsorted', 'unsorted'],
    ['/favorites#top', 'favorites'],
    ['/recent', 'recent'],
    ['/folders/abc-1', 'abc-1'],
    ['/folders/abc-1?sort=title', 'abc-1'],
  ])('maps %s to %s', (url, id) => {
    expect(sidebarActiveId(url)).toBe(id);
  });

  it.each(['/', '/settings', '/folders', '/folders/'])('has no row for %s', (url) => {
    expect(sidebarActiveId(url)).toBeNull();
  });
});
