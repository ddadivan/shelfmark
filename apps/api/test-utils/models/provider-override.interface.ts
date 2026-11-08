import type { InjectionToken } from '@nestjs/common';

/** A provider replaced by a fixed value in a test app. */
export interface ProviderOverride {
  provide: InjectionToken;
  useValue: unknown;
}
