import { Service } from '@angular/core';
import type { TagResponse } from '@shelfmark/contracts';
import { MOCK_TAGS } from '@shelfmark/contracts/testing';
import { delay, type Observable, of } from 'rxjs';
import { MOCK_LATENCY_MS } from '../models/mock-latency.const';
import type { TagsApi } from '../models/tags-api.interface';

/** `TagsApi` over the contract fixtures, until #76. */
@Service()
export class MockTagsApi implements TagsApi {
  list(): Observable<readonly TagResponse[]> {
    return of(MOCK_TAGS).pipe(delay(MOCK_LATENCY_MS.List));
  }
}
