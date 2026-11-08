import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { OnboardingResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import { ONBOARDING_ENDPOINT } from '../models/onboarding-endpoint.const';
import type { OnboardingApi } from '../models/onboarding-api.interface';
import { skipErrorToast } from '../../../core/api/skip-error-toast';

/** `OnboardingApi` over `POST` / `DELETE /api/me/onboarding`. */
@Service()
export class HttpOnboardingApi implements OnboardingApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}${ONBOARDING_ENDPOINT}`;

  complete(): Promise<OnboardingResponse> {
    return firstValueFrom(
      this.http.post<OnboardingResponse>(this.url, null, { context: skipErrorToast() }),
    );
  }

  async reset(): Promise<void> {
    await firstValueFrom(this.http.delete<void>(this.url, { context: skipErrorToast() }));
  }
}
