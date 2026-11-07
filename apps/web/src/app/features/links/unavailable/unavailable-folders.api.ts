import { Service } from '@angular/core';
import { type Observable, throwError } from 'rxjs';
import type { FoldersApi } from '../models/folders-api.interface';
import { UNAVAILABLE_MESSAGE } from '../models/unavailable-message.const';

/** Production placeholder for `FoldersApi` until `HttpFoldersApi` is wired in. */
@Service()
export class UnavailableFoldersApi implements FoldersApi {
  list(): Observable<never> {
    return throwError(() => new Error(UNAVAILABLE_MESSAGE));
  }

  create(): Observable<never> {
    return throwError(() => new Error(UNAVAILABLE_MESSAGE));
  }

  update(): Observable<never> {
    return throwError(() => new Error(UNAVAILABLE_MESSAGE));
  }

  remove(): Observable<never> {
    return throwError(() => new Error(UNAVAILABLE_MESSAGE));
  }
}
