import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ME_STATS_ENDPOINT, type MeStatsResponse } from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { MeStatsApi } from '../models/me-stats-api.interface';

/** `MeStatsApi` over `/api/me/stats`. Skips the global error toast: the Account page shows its own. */
@Service()
export class HttpMeStatsApi implements MeStatsApi {
  private readonly http = inject(HttpClient);

  get(): Observable<MeStatsResponse> {
    return this.http.get<MeStatsResponse>(ME_STATS_ENDPOINT, { context: skipErrorToast() });
  }
}
