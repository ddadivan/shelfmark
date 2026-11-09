import { ActivatedRouteSnapshot, type Route } from '@angular/router';
import { loadLibraryPage } from '../../features/library/load-library-page';
import { LibraryRouteReuseStrategy } from './library-route-reuse.strategy';

function snapshot(routeConfig: Route | null): ActivatedRouteSnapshot {
  return Object.assign(new ActivatedRouteSnapshot(), { routeConfig });
}

describe('LibraryRouteReuseStrategy', () => {
  const strategy = new LibraryRouteReuseStrategy();
  const all: Route = { path: 'links', loadComponent: loadLibraryPage };
  const unsorted: Route = { path: 'unsorted', loadComponent: loadLibraryPage };
  const settings: Route = {
    path: 'settings',
    loadComponent: () => import('../../features/privacy/privacy.page'),
  };

  it('reuses the page between two library views', () => {
    expect(strategy.shouldReuseRoute(snapshot(unsorted), snapshot(all))).toBe(true);
  });

  it('reuses a route that stays the same', () => {
    expect(strategy.shouldReuseRoute(snapshot(settings), snapshot(settings))).toBe(true);
  });

  it('does not reuse the library page for another page', () => {
    expect(strategy.shouldReuseRoute(snapshot(settings), snapshot(all))).toBe(false);
    expect(strategy.shouldReuseRoute(snapshot(all), snapshot(settings))).toBe(false);
  });
});
