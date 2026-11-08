import type { LINKS_SCOPE } from './links-scope.const';

export type LinksScope = (typeof LINKS_SCOPE)[keyof typeof LINKS_SCOPE];
