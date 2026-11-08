import { Service } from '@angular/core';
import type { MergeTagResponse, TagResponse } from '@shelfmark/contracts';
import { type Observable, throwError } from 'rxjs';
import { UNAVAILABLE_MESSAGE } from '../models/unavailable-message.const';
import type { TagsApi } from '../models/tags-api.interface';

/** Production placeholder for `TagsApi` until the tags API is wired in. */
@Service()
export class UnavailableTagsApi implements TagsApi {
  list(): Observable<readonly TagResponse[]> {
    return this.unavailable();
  }

  create(): Observable<TagResponse> {
    return this.unavailable();
  }

  update(): Observable<TagResponse> {
    return this.unavailable();
  }

  remove(): Observable<void> {
    return this.unavailable();
  }

  merge(): Observable<MergeTagResponse> {
    return this.unavailable();
  }

  private unavailable(): Observable<never> {
    return throwError(() => new Error(UNAVAILABLE_MESSAGE));
  }
}
