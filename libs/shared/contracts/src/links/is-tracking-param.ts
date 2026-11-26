import { TRACKING_QUERY_PARAM_PREFIXES } from './tracking-query-param-prefixes.const';
import { TRACKING_QUERY_PARAMS } from './tracking-query-params.const';

/** True for a query parameter name that only tracks (`TRACKING_QUERY_PARAMS`, `utm_*`). */
export function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    TRACKING_QUERY_PARAMS.includes(lower) ||
    TRACKING_QUERY_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix))
  );
}
