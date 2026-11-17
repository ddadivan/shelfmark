import { InjectionToken } from '@angular/core';
import type { AiApi } from './ai-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const AI_API = new InjectionToken<AiApi>('AI_API');
