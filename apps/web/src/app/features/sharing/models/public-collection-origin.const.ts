import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';

/**
 * The origin public collection addresses are built from (`{origin}/c/{token}`): the page's own
 * origin. Only the mock providers override it (the promo's `showcase` scenario, #326).
 */
export const PUBLIC_COLLECTION_ORIGIN = new InjectionToken<string>('PUBLIC_COLLECTION_ORIGIN', {
  factory: () => inject(DOCUMENT).location?.origin ?? '',
});
