import { inject, Service } from '@angular/core';
import type { TagResponse } from '@shelfmark/contracts';
import { delay, defer, type Observable, of } from 'rxjs';
import { MOCK_LATENCY_MS } from '../models/mock-latency.const';
import type { TagsApi } from '../models/tags-api.interface';
import { MockLibraryData } from './mock-library-data';

/** `TagsApi` over the shared in-memory library, until #76. */
@Service()
export class MockTagsApi implements TagsApi {
  private readonly data = inject(MockLibraryData);

  list(): Observable<readonly TagResponse[]> {
    return defer(() => of(this.data.tagsView())).pipe(delay(MOCK_LATENCY_MS.List));
  }
}
