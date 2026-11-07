import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  TAG_LIMIT,
  type CreateTagRequest,
  type MergeTagResponse,
  type TagResponse,
  type UpdateTagRequest,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { MOCK_LATENCY_MS } from '../models/mock-latency.const';
import { MOCK_TAG_NAME } from '../models/mock-tag-name.const';
import type { TagsApi } from '../models/tags-api.interface';
import { MockLibraryData } from './mock-library-data';

function conflict(): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status: HttpStatusCode.Conflict, statusText: 'Conflict' }),
  );
}

/**
 * `TagsApi` over the shared in-memory library, with simulated latency. Names are unique
 * case-insensitively (409), a case-only rename of the same tag is allowed. Tags named like
 * `MOCK_TAG_NAME` fail on create, update / merge or delete.
 */
@Service()
export class MockTagsApi implements TagsApi {
  private readonly data = inject(MockLibraryData);

  list(): Observable<readonly TagResponse[]> {
    return defer(() => of(this.data.tagsView())).pipe(delay(MOCK_LATENCY_MS.List));
  }

  create(request: CreateTagRequest): Observable<TagResponse> {
    return defer(() => {
      if (
        request.name === MOCK_TAG_NAME.CreateFails ||
        this.data.tagList.length >= TAG_LIMIT.PerUserMax
      ) {
        return throwError(() => new Error('Mock: tag create failed'));
      }
      if (this.byName(request.name)) {
        return conflict();
      }
      const now = new Date().toISOString();
      const tag: TagResponse = {
        id: globalThis.crypto.randomUUID(),
        name: request.name,
        linkCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      this.data.setTags([...this.data.tagList, tag]);
      return of({ ...tag });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  update(id: string, request: UpdateTagRequest): Observable<TagResponse> {
    return defer(() => {
      const current = this.find(id);
      if (!current || current.name === MOCK_TAG_NAME.UpdateFails) {
        return throwError(() => new Error('Mock: tag update failed'));
      }
      const other = this.byName(request.name);
      if (other && other.id !== id) {
        return conflict();
      }
      const updated: TagResponse = {
        ...current,
        name: request.name,
        updatedAt: new Date().toISOString(),
      };
      this.data.setTags(this.data.tagList.map((tag) => (tag.id === id ? updated : tag)));
      this.data.retagLinks((name) => (name === current.name ? updated.name : name));
      return of(this.view(id));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  remove(id: string): Observable<void> {
    return defer(() => {
      const current = this.find(id);
      if (!current || current.name === MOCK_TAG_NAME.DeleteFails) {
        return throwError(() => new Error('Mock: tag delete failed'));
      }
      this.data.setTags(this.data.tagList.filter((tag) => tag.id !== id));
      this.data.retagLinks((name) => (name === current.name ? null : name));
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  merge(id: string, targetTagId: string): Observable<MergeTagResponse> {
    return defer(() => {
      const source = this.find(id);
      const target = this.find(targetTagId);
      if (
        !source ||
        !target ||
        source.id === target.id ||
        source.name === MOCK_TAG_NAME.UpdateFails
      ) {
        return throwError(() => new Error('Mock: tag update failed'));
      }
      this.data.setTags(this.data.tagList.filter((tag) => tag.id !== id));
      this.data.retagLinks((name) => (name === source.name ? target.name : name));
      return of(this.view(targetTagId));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private find(id: string): TagResponse | undefined {
    return this.data.tagList.find((tag) => tag.id === id);
  }

  private byName(name: string): TagResponse | undefined {
    return this.data.tagList.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
  }

  /** The tag with its current `linkCount`. */
  private view(id: string): TagResponse {
    const tag = this.data.tagsView().find((item) => item.id === id);
    if (!tag) {
      throw new Error('Mock: tag update failed');
    }
    return tag;
  }
}
