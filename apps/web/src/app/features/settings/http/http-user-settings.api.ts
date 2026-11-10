import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  USER_SETTINGS_ENDPOINT,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { UserSettingsApi } from '../models/user-settings-api.interface';

/** `UserSettingsApi` over `/api/me/settings`. Both calls skip the global error toast: the caller reports. */
@Service()
export class HttpUserSettingsApi implements UserSettingsApi {
  private readonly http = inject(HttpClient);

  get(): Observable<UserSettingsResponse> {
    return this.http.get<UserSettingsResponse>(USER_SETTINGS_ENDPOINT, {
      context: skipErrorToast(),
    });
  }

  update(request: UpdateUserSettingsRequest): Observable<UserSettingsResponse> {
    return this.http.patch<UserSettingsResponse>(USER_SETTINGS_ENDPOINT, request, {
      context: skipErrorToast(),
    });
  }
}
