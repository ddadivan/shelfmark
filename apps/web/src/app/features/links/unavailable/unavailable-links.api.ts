import { Service } from '@angular/core';
import { type Observable, throwError } from 'rxjs';
import type { LinksApi } from '../models/links-api.interface';
import { UNAVAILABLE_MESSAGE } from '../models/unavailable-message.const';

/** Production placeholder for `LinksApi` until #72: every call fails with a clear error. */
@Service()
export class UnavailableLinksApi implements LinksApi {
  preview(): Observable<never> {
    return this.fail();
  }

  create(): Observable<never> {
    return this.fail();
  }

  list(): Observable<never> {
    return this.fail();
  }

  recent(): Observable<never> {
    return this.fail();
  }

  update(): Observable<never> {
    return this.fail();
  }

  remove(): Observable<never> {
    return this.fail();
  }

  open(): Observable<never> {
    return this.fail();
  }

  private fail(): Observable<never> {
    return throwError(() => new Error(UNAVAILABLE_MESSAGE));
  }
}
