import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { AccountDeletionStatus, DeleteAccountRequest } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import { ACCOUNT_DELETION_ENDPOINT } from '../models/account-deletion-endpoint.const';
import { ACCOUNT_DELETION_STATUS_ENDPOINT } from '../models/account-deletion-status-endpoint.const';
import type { AccountDeletionApi } from '../models/account-deletion-api.interface';

/**
 * `AccountDeletionApi` over `DELETE /api/me` and `/api/me/deletion`; the dialog and the Account
 * page show their own errors (no global toast).
 */
@Service()
export class HttpAccountDeletionApi implements AccountDeletionApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly url = `${this.base}${ACCOUNT_DELETION_ENDPOINT}`;
  private readonly statusUrl = `${this.base}${ACCOUNT_DELETION_STATUS_ENDPOINT}`;

  async delete(request: DeleteAccountRequest): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(this.url, { body: request, context: skipErrorToast() }),
    );
  }

  status(): Promise<AccountDeletionStatus> {
    return firstValueFrom(
      this.http.get<AccountDeletionStatus>(this.statusUrl, { context: skipErrorToast() }),
    );
  }

  cancel(): Promise<AccountDeletionStatus> {
    return firstValueFrom(
      this.http.delete<AccountDeletionStatus>(this.statusUrl, { context: skipErrorToast() }),
    );
  }
}
