import type { ActivatedRouteSnapshot, Params } from '@angular/router';
import { SPLIT_QUERY_PARAM } from '../../features/library/models/split-query-param.const';

/** The deepest activated route: the page itself. */
function leaf(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  let current = snapshot;
  while (current.firstChild) {
    current = current.firstChild;
  }
  return current;
}

function withoutSplit(params: Params): Params {
  const { [SPLIT_QUERY_PARAM]: _split, ...rest } = params;
  return rest;
}

/**
 * Whether a navigation only opens, closes or changes the right half of the side-by-side view:
 * the same page with the same route parameters and the same query, except `?split`.
 */
export function onlySplitChanged(
  from: ActivatedRouteSnapshot,
  to: ActivatedRouteSnapshot,
): boolean {
  const before = leaf(from);
  const after = leaf(to);
  return (
    before.routeConfig === after.routeConfig &&
    JSON.stringify(before.params) === JSON.stringify(after.params) &&
    JSON.stringify(withoutSplit(before.queryParams)) ===
      JSON.stringify(withoutSplit(after.queryParams)) &&
    before.queryParams[SPLIT_QUERY_PARAM] !== after.queryParams[SPLIT_QUERY_PARAM]
  );
}
