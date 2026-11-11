import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  ADMIN_ENDPOINT,
  ADMIN_FEEDBACK_LIMIT,
  FEEDBACK_STATUS,
  type AdminFeedbackItem,
  type ListAdminFeedbackResponse,
  type ListAdminFeedbackQuery,
  type UpdateAdminFeedbackRequest,
} from '@shelfmark/contracts';
import { MockFeedbackData } from '../../feedback/mock/mock-feedback-data.service';
import { MOCK_ADMIN_ERROR_MESSAGE } from '../../feedback/mock/models/mock-admin-error-message.const';
import { MOCK_ADMIN_MODE } from '../../feedback/mock/models/mock-admin-mode.const';
import type { AdminApi } from '../models/admin-api.interface';
import { ADMIN_LIMIT } from '../models/admin-limit.const';

/** The admin sees the screenshot through the admin route, not the owner's. */
function forAdmin(message: AdminFeedbackItem): AdminFeedbackItem {
  return message.screenshotUrl === null
    ? message
    : { ...message, screenshotUrl: `${ADMIN_ENDPOINT.Feedback}/${message.id}/screenshot` };
}

function notFound(): Promise<never> {
  return Promise.reject(new HttpErrorResponse({ status: HttpStatusCode.NotFound }));
}

/**
 * In-browser stand-in for `/api/admin`: the mock user is the author unless `sm-mock-admin` is
 * `off` (a regular user: 404 everywhere) or a demo user. It reads and writes the messages of
 * `MockFeedbackData`, so a status or reply set here shows up in the user's Your feedback.
 * `sm-mock-admin=save-fails` makes every update fail (e2e of the rollback).
 */
@Service()
export class MockAdminApi implements AdminApi {
  private readonly data = inject(MockFeedbackData);

  isAdmin(): Promise<boolean> {
    return Promise.resolve(this.data.isAdmin());
  }

  listFeedback(query: ListAdminFeedbackQuery): Promise<ListAdminFeedbackResponse> {
    if (!this.data.isAdmin()) {
      return notFound();
    }
    const all = this.data
      .entries()
      .map((entry) => entry.message)
      .filter((message) => query.status === undefined || message.status === query.status);
    const start = query.cursor === undefined ? 0 : Number(query.cursor);
    const limit = query.limit ?? ADMIN_LIMIT.PageSize;
    const end = start + limit;
    return Promise.resolve({
      items: all.slice(start, end).map(forAdmin),
      nextCursor: end < all.length ? String(end) : null,
    });
  }

  updateFeedback(id: string, request: UpdateAdminFeedbackRequest): Promise<AdminFeedbackItem> {
    if (!this.data.isAdmin()) {
      return notFound();
    }
    if (this.data.adminMode() === MOCK_ADMIN_MODE.SaveFails) {
      return Promise.reject(new Error(MOCK_ADMIN_ERROR_MESSAGE));
    }
    const entries = this.data.entries();
    const index = entries.findIndex((entry) => entry.message.id === id);
    const found = entries[index];
    if (found === undefined) {
      return notFound();
    }
    const reply = request.reply;
    if (
      (request.status === undefined && reply === undefined) ||
      (request.status !== undefined &&
        !Object.values<string>(FEEDBACK_STATUS).includes(request.status)) ||
      (typeof reply === 'string' && reply.length > ADMIN_FEEDBACK_LIMIT.ReplyMax)
    ) {
      return Promise.reject(new HttpErrorResponse({ status: HttpStatusCode.BadRequest }));
    }
    const message: AdminFeedbackItem = {
      ...found.message,
      status: request.status ?? found.message.status,
      // A blank reply clears it, like null.
      reply: reply === undefined ? found.message.reply : reply?.trim() || null,
      updatedAt: new Date().toISOString(),
    };
    entries[index] = { ...found, message };
    this.data.save(entries);
    return Promise.resolve(forAdmin(message));
  }
}
