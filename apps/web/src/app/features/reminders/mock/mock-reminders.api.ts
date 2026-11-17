import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  LINK_ERROR_MESSAGE,
  LINK_LIMIT,
  REMINDER_LIMIT,
  remindAtProblem,
  type LinkResponse,
  type ListRemindersResponse,
  type ReminderCountResponse,
  type SetRemindersBatchRequest,
  type SetRemindersBatchResponse,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { RemindersApi } from '../models/reminders-api.interface';

/** Soonest first, then by id: the order of the API. */
function bySoonest(a: LinkResponse, b: LinkResponse): number {
  return (a.remindAt ?? '').localeCompare(b.remindAt ?? '') || a.id.localeCompare(b.id);
}

/**
 * `RemindersApi` over the shared in-memory library, with simulated latency and the API's rules: a
 * link is due once its `remindAt` has passed, a new time must lie ahead (`remindAtProblem`), a
 * missing link is the API's 404 and the batch ignores unknown ids. Trashed links are not in the
 * library, so they are left out like on the server.
 */
@Service()
export class MockRemindersApi implements RemindersApi {
  private readonly data = inject(MockLibraryData);

  list(): Observable<ListRemindersResponse> {
    return defer(() => {
      const now = new Date().toISOString();
      const withReminder = this.data.links
        .filter((link) => link.remindAt !== null)
        .sort(bySoonest)
        .map((link) => this.data.linkView(link));
      return of<ListRemindersResponse>({
        due: withReminder
          .filter((link) => (link.remindAt ?? '') <= now)
          .slice(0, REMINDER_LIMIT.ListMax),
        upcoming: withReminder
          .filter((link) => (link.remindAt ?? '') > now)
          .slice(0, REMINDER_LIMIT.ListMax),
      });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  count(): Observable<ReminderCountResponse> {
    return defer(() => {
      const now = new Date().toISOString();
      const due = this.data.links.filter(
        (link) => link.remindAt !== null && link.remindAt <= now,
      ).length;
      return of<ReminderCountResponse>({ due });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  set(linkId: string, remindAt: string): Observable<LinkResponse> {
    return defer(() => {
      const problem = remindAtProblem(remindAt, Date.now());
      if (problem) {
        return throwError(() => mockHttpError(HttpStatusCode.BadRequest, problem));
      }
      const link = this.data.links.find((item) => item.id === linkId);
      if (!link) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.NotFound, LINK_ERROR_MESSAGE.NotFound),
        );
      }
      const next = this.assign([linkId], new Date(remindAt).toISOString())[0] ?? link;
      return of(this.data.linkView(next));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  clear(linkId: string): Observable<void> {
    return defer(() => {
      if (!this.data.links.some((item) => item.id === linkId)) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.NotFound, LINK_ERROR_MESSAGE.NotFound),
        );
      }
      this.assign([linkId], null);
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  setMany(request: SetRemindersBatchRequest): Observable<SetRemindersBatchResponse> {
    return defer(() => {
      const { ids, remindAt } = request;
      if (ids.length < 1 || ids.length > LINK_LIMIT.BatchMax || new Set(ids).size !== ids.length) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.BadRequest, ['ids must hold 1 to 100 distinct ids']),
        );
      }
      const problem = remindAt === null ? null : remindAtProblem(remindAt, Date.now());
      if (problem) {
        return throwError(() => mockHttpError(HttpStatusCode.BadRequest, problem));
      }
      const changed = this.assign(ids, remindAt === null ? null : new Date(remindAt).toISOString());
      const byId = new Map(changed.map((link) => [link.id, this.data.linkView(link)]));
      const links = ids
        .map((id) => byId.get(id))
        .filter((link): link is LinkResponse => link !== undefined);
      return of<SetRemindersBatchResponse>({ updated: links.length, links });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  /** Sets `remindAt` on the known links among `ids` (like the API, `updatedAt` stays). */
  private assign(ids: readonly string[], remindAt: string | null): LinkResponse[] {
    const wanted = new Set(ids);
    const changed: LinkResponse[] = [];
    this.data.links = this.data.links.map((link) => {
      if (!wanted.has(link.id)) {
        return link;
      }
      const next = { ...link, remindAt };
      changed.push(next);
      return next;
    });
    return changed;
  }
}
