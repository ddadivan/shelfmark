import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { DeleteAccountRequest } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import { ACCOUNT_DELETION_ENDPOINT } from '../models/account-deletion-endpoint.const';
import type { AccountDeletionApi } from '../models/account-deletion-api.interface';

/** `AccountDeletionApi` over `DELETE /api/me`; the dialog shows its own errors (no global toast). */
@Service()
export class HttpAccountDeletionApi implements AccountDeletionApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}${ACCOUNT_DELETION_ENDPOINT}`;

  async delete(request: DeleteAccountRequest): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(this.url, { body: request, context: skipErrorToast() }),
    );
  }
}
