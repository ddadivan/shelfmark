import type { ActivatedRouteSnapshot, Params, Route } from '@angular/router';
import { onlySplitChanged } from './only-split-changed';

const ROUTE: Route = { path: 'folders/:folderId' };

function snapshot(
  queryParams: Params,
  params: Params = { folderId: 'a' },
  routeConfig: Route = ROUTE,
): ActivatedRouteSnapshot {
  const page = { routeConfig, params, queryParams, firstChild: null };
  return { firstChild: page, queryParams } as unknown as ActivatedRouteSnapshot;
}

describe('onlySplitChanged', () => {
  it('is true when ?split opens, changes or closes on the same page', () => {
    expect(onlySplitChanged(snapshot({}), snapshot({ split: '' }))).toBe(true);
    expect(onlySplitChanged(snapshot({ split: '' }), snapshot({ split: 'unsorted' }))).toBe(true);
    expect(onlySplitChanged(snapshot({ split: 'unsorted' }), snapshot({}))).toBe(true);
  });

  it('is false when another query parameter changes too', () => {
    expect(onlySplitChanged(snapshot({ sort: 'oldest' }), snapshot({ split: '' }))).toBe(false);
  });

  it('is false for another route parameter or another page', () => {
    expect(onlySplitChanged(snapshot({}), snapshot({ split: '' }, { folderId: 'b' }))).toBe(false);
    expect(onlySplitChanged(snapshot({}), snapshot({ split: '' }, {}, { path: 'unsorted' }))).toBe(
      false,
    );
  });

  it('is false when nothing changed', () => {
    expect(onlySplitChanged(snapshot({ split: '' }), snapshot({ split: '' }))).toBe(false);
  });
});
