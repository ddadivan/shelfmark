import { sidebarRoute } from './sidebar-route';

describe('sidebarRoute', () => {
  it.each([
    ['all', ['/links']],
    ['unsorted', ['/unsorted']],
    ['favorites', ['/favorites']],
    ['recent', ['/recent']],
    ['abc-1', ['/folders', 'abc-1']],
  ])('routes %s', (id, commands) => {
    expect(sidebarRoute(id)).toEqual(commands);
  });
});
