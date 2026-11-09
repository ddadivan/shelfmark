import { Service } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';
import { loadLibraryPage } from '../../features/library/load-library-page';

/**
 * Keeps the library page alive when the user switches between its views (all links, unsorted,
 * favorites, a folder). They are separate routes of one component; by default each switch
 * destroyed the page and built a new one, which painted an empty frame first and made the toolbar
 * and the list jump (CLS). The page reads its scope and folder from the route inputs, so the same
 * instance simply gets new ones and shows its skeleton while the next list loads.
 */
@Service()
export class LibraryRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    current: ActivatedRouteSnapshot,
  ): boolean {
    return (
      super.shouldReuseRoute(future, current) ||
      (future.routeConfig?.loadComponent === loadLibraryPage &&
        current.routeConfig?.loadComponent === loadLibraryPage)
    );
  }
}
