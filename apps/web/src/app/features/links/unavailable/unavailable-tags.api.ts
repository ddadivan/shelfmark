import { Service } from '@angular/core';
import { type Observable, throwError } from 'rxjs';
import { UNAVAILABLE_MESSAGE } from '../models/unavailable-message.const';
import type { TagsApi } from '../models/tags-api.interface';

/** Production placeholder for `TagsApi` until #76. */
@Service()
export class UnavailableTagsApi implements TagsApi {
  list(): Observable<never> {
    return throwError(() => new Error(UNAVAILABLE_MESSAGE));
  }
}
