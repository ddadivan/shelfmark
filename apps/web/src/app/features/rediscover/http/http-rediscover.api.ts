import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { REDISCOVER_ENDPOINT, type RediscoverResponse } from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { RediscoverApi } from '../models/rediscover-api.interface';

/** `RediscoverApi` over `REDISCOVER_ENDPOINT`; the block is optional, so no error toasts. */
@Service()
export class HttpRediscoverApi implements RediscoverApi {
  private readonly http = inject(HttpClient);

  getBlock(): Observable<RediscoverResponse> {
    return this.http.get<RediscoverResponse>(REDISCOVER_ENDPOINT.Block, {
      context: skipErrorToast(),
    });
  }

  dismiss(): Observable<void> {
    return this.http.post<void>(REDISCOVER_ENDPOINT.Dismiss, {}, { context: skipErrorToast() });
  }

  hide(linkId: string): Observable<void> {
    return this.http.post<void>(
      REDISCOVER_ENDPOINT.Hide.replace(':id', encodeURIComponent(linkId)),
      {},
      { context: skipErrorToast() },
    );
  }
}
