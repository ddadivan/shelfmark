import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { AdminApi } from '../models/admin-api.interface';
import { ADMIN_ENDPOINT } from '../models/admin-endpoint.const';
import type { AdminFeedbackMessage } from '../models/admin-feedback-message.interface';
import type { AdminFeedbackPage } from '../models/admin-feedback-page.interface';
import type { AdminFeedbackQuery } from '../models/admin-feedback-query.interface';
import type { UpdateAdminFeedbackRequest } from '../models/update-admin-feedback-request.interface';

/**
 * `AdminApi` over `/api/admin`. The status call never shows the error toast and never fails: a
 * 404 (not the author) and any other failure both mean "not an admin". The inbox calls skip the
 * toast too, the page and the store word their own errors.
 */
@Service()
export class HttpAdminApi implements AdminApi {
  private readonly http = inject(HttpClient);

  async isAdmin(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get<unknown>(ADMIN_ENDPOINT.Status, { context: skipErrorToast() }),
      );
      return true;
    } catch {
      return false;
    }
  }

  listFeedback(query: AdminFeedbackQuery): Promise<AdminFeedbackPage> {
    let params = new HttpParams();
    if (query.cursor !== undefined) {
      params = params.set('cursor', query.cursor);
    }
    if (query.limit !== undefined) {
      params = params.set('limit', query.limit);
    }
    if (query.status !== undefined) {
      params = params.set('status', query.status);
    }
    return firstValueFrom(
      this.http.get<AdminFeedbackPage>(ADMIN_ENDPOINT.Feedback, {
        params,
        context: skipErrorToast(),
      }),
    );
  }

  updateFeedback(id: string, request: UpdateAdminFeedbackRequest): Promise<AdminFeedbackMessage> {
    return firstValueFrom(
      this.http.patch<AdminFeedbackMessage>(
        `${ADMIN_ENDPOINT.Feedback}/${encodeURIComponent(id)}`,
        request,
        { context: skipErrorToast() },
      ),
    );
  }
}
