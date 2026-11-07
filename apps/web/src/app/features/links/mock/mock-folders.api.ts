import { Service } from '@angular/core';
import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { delay, type Observable, of } from 'rxjs';
import type { FoldersApi } from '../models/folders-api.interface';
import { MOCK_LATENCY_MS } from '../models/mock-latency.const';

/** `FoldersApi` over the contract fixtures, until #75. */
@Service()
export class MockFoldersApi implements FoldersApi {
  list(): Observable<readonly FolderResponse[]> {
    return of(MOCK_FOLDERS).pipe(delay(MOCK_LATENCY_MS.List));
  }
}
