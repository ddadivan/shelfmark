import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  SAVED_VIEW_ERROR_MESSAGE,
  SAVED_VIEW_LIMIT,
  SAVED_VIEW_SCOPE,
  type CreateSavedViewRequest,
  type ListSavedViewsQuery,
  type ListSavedViewsResponse,
  type SavedViewQueryRequest,
  type SavedViewResponse,
  type UpdateSavedViewRequest,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { SavedViewsApi } from '../models/saved-views-api.interface';
import { feedListQuery, listQueryOf, normalizeViewQuery } from '../utils/saved-view-query';
import type { MockSavedView } from './models/mock-saved-view.interface';

function failure(status: number, message?: string | string[]): Observable<never> {
  return throwError(() => mockHttpError(status, message));
}

/** A view name that fails to save (e2e and manual checks of the rollback). */
const FAILING_NAME = 'Fails to save';

/**
 * `SavedViewsApi` over the shared in-memory library, with simulated latency. Like the real API:
 * names are trimmed (1 to `SAVED_VIEW_LIMIT.NameMax`, else 400), a folder view needs a live folder
 * (404), at most `SAVED_VIEW_LIMIT.PerUserMax` views (409), a reorder lists exactly the views (400);
 * counts come from the same filters as the mock list, and a view whose folder is gone is
 * unavailable. A view named "Fails to save" (create or rename) is refused with a 500.
 */
@Service()
export class MockSavedViewsApi implements SavedViewsApi {
  private readonly data = inject(MockLibraryData);

  list(feed?: ListSavedViewsQuery): Observable<ListSavedViewsResponse> {
    return defer(() => {
      if (feed?.scope === SAVED_VIEW_SCOPE.Folder && !feed.folderId) {
        return failure(HttpStatusCode.BadRequest, SAVED_VIEW_ERROR_MESSAGE.FeedFolderRequired);
      }
      if ((feed?.tag?.length ?? 0) > SAVED_VIEW_LIMIT.TagsMax) {
        return failure(HttpStatusCode.BadRequest, ['too many tags']);
      }
      return of(this.view(feed));
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  create(request: CreateSavedViewRequest): Observable<SavedViewResponse> {
    return defer(() => {
      const name = request.name.trim();
      const refused = this.refuse(name, request.query);
      if (refused) {
        return refused;
      }
      if (this.data.views.length >= SAVED_VIEW_LIMIT.PerUserMax) {
        return failure(HttpStatusCode.Conflict, SAVED_VIEW_ERROR_MESSAGE.LimitReached);
      }
      const view: MockSavedView = {
        id: globalThis.crypto.randomUUID(),
        name,
        query: normalizeViewQuery(request.query),
      };
      this.data.views = [...this.data.views, view];
      return of(this.one(view.id));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  update(id: string, request: UpdateSavedViewRequest): Observable<SavedViewResponse> {
    return defer(() => {
      const current = this.data.views.find((view) => view.id === id);
      if (!current) {
        return failure(HttpStatusCode.NotFound, SAVED_VIEW_ERROR_MESSAGE.NotFound);
      }
      const name = request.name?.trim() ?? current.name;
      const refused = this.refuse(name, request.query);
      if (refused) {
        return refused;
      }
      const next: MockSavedView = {
        ...current,
        name,
        query: request.query ? normalizeViewQuery(request.query) : current.query,
      };
      this.data.views = this.data.views.map((view) => (view.id === id ? next : view));
      return of(this.one(id));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  remove(id: string): Observable<void> {
    return defer(() => {
      if (!this.data.views.some((view) => view.id === id)) {
        return failure(HttpStatusCode.NotFound, SAVED_VIEW_ERROR_MESSAGE.NotFound);
      }
      this.data.views = this.data.views.filter((view) => view.id !== id);
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  reorder(ids: readonly string[]): Observable<ListSavedViewsResponse> {
    return defer(() => {
      const current = this.data.views;
      const same =
        ids.length === current.length &&
        new Set(ids).size === ids.length &&
        current.every((view) => ids.includes(view.id));
      if (!same) {
        return failure(HttpStatusCode.BadRequest, SAVED_VIEW_ERROR_MESSAGE.OrderMismatch);
      }
      this.data.views = ids.flatMap((id) => current.filter((view) => view.id === id));
      return of(this.view());
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  /** The error the API would answer for this name and query, or `null`. */
  private refuse(name: string, query?: SavedViewQueryRequest): Observable<never> | null {
    if (name === FAILING_NAME) {
      return failure(HttpStatusCode.InternalServerError, 'Internal Server Error');
    }
    if (name === '' || name.length > SAVED_VIEW_LIMIT.NameMax) {
      return failure(HttpStatusCode.BadRequest, ['name must be 1 to 40 characters']);
    }
    if (query?.scope === SAVED_VIEW_SCOPE.Folder) {
      if (!query.folderId) {
        return failure(HttpStatusCode.BadRequest, SAVED_VIEW_ERROR_MESSAGE.FolderRequired);
      }
      const exists = this.data.folderList.some((folder) => folder.id === query.folderId);
      if (!exists) {
        return failure(HttpStatusCode.NotFound, SAVED_VIEW_ERROR_MESSAGE.FolderNotFound);
      }
    } else if (query?.folderId) {
      return failure(HttpStatusCode.BadRequest, SAVED_VIEW_ERROR_MESSAGE.FolderNotAllowed);
    }
    return null;
  }

  private one(id: string): SavedViewResponse {
    const found = this.view().items.find((item) => item.id === id);
    if (!found) {
      throw new Error(`Mock: no view ${id}`);
    }
    return found;
  }

  private view(feed?: ListSavedViewsQuery): ListSavedViewsResponse {
    // A feed (#335): the total and every count are taken inside it, like the API's grouped query.
    const inFeed = feed
      ? new Set(this.data.matching(feedListQuery(feed)).map((link) => link.id))
      : null;
    const within = (links: readonly { id: string }[]): number =>
      inFeed ? links.filter((link) => inFeed.has(link.id)).length : links.length;
    return {
      total: inFeed ? inFeed.size : this.data.links.length,
      items: this.data.views.map((view, position) => {
        const available =
          view.query.scope !== SAVED_VIEW_SCOPE.Folder ||
          this.data.folderList.some((folder) => folder.id === view.query.folderId);
        return {
          id: view.id,
          name: view.name,
          query: { ...view.query, tags: [...view.query.tags] },
          position,
          available,
          count: available ? within(this.data.matching(listQueryOf(view.query))) : 0,
        };
      }),
    };
  }
}
