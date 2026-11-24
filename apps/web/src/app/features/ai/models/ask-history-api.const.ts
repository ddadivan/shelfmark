import { InjectionToken } from '@angular/core';
import type { AskHistoryApi } from './ask-history-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const ASK_HISTORY_API = new InjectionToken<AskHistoryApi>('ASK_HISTORY_API');
