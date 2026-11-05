import { InjectionToken } from '@angular/core';

/** Relative base URL of the REST API; the dev server proxies it to the NestJS app. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
