import { inject, InjectionToken } from '@angular/core';
import { MockLinksApi } from '../mock/mock-links.api';
import type { LinksApi } from './links-api.interface';

/**
 * Default is the mock built from the contract fixtures until the real API lands (#72), which
 * swaps this factory for the `HttpClient` implementation. Specs and `provideLinksApi()` override it.
 */
export const LINKS_API = new InjectionToken<LinksApi>('LINKS_API', {
  factory: () => inject(MockLinksApi),
});
