import { InjectionToken } from '@angular/core';
import type { RulesApi } from './rules-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const RULES_API = new InjectionToken<RulesApi>('RULES_API');
