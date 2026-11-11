import type { Observable } from 'rxjs';
import type { UpdateUserSettingsRequest, UserSettingsResponse } from '@shelfmark/contracts';

/** Seam for the account settings (`/api/me/settings`): preferences that follow the user to every device. */
export interface UserSettingsApi {
  /** `GET /api/me/settings`. */
  get(): Observable<UserSettingsResponse>;
  /** `PATCH /api/me/settings`: only the fields to change; answers the settings as they are now. */
  update(request: UpdateUserSettingsRequest): Observable<UserSettingsResponse>;
}
