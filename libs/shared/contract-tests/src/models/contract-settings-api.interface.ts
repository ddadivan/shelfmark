import type { UpdateUserSettingsRequest, UserSettingsResponse } from '@shelfmark/contracts';

/** `GET` and `PATCH /api/me/settings` as the scenarios call them. */
export interface ContractSettingsApi {
  get(): Promise<UserSettingsResponse>;
  update(request: UpdateUserSettingsRequest): Promise<UserSettingsResponse>;
}
