import type { FETCH_KIND } from './fetch-kind.const';

export type FetchKind = (typeof FETCH_KIND)[keyof typeof FETCH_KIND];
