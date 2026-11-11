import { inject, Service } from '@angular/core';
import type { UpdateUserSettingsRequest, UserSettingsResponse } from '@shelfmark/contracts';
import { defer, delay, type Observable, of } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { UserSettingsApi } from '../models/user-settings-api.interface';

/**
 * `UserSettingsApi` over the shared in-memory library, with simulated latency: the retention
 * lives next to the mock Trash, so a change shows in the days left of the mock entries.
 */
@Service()
export class MockUserSettingsApi implements UserSettingsApi {
  private readonly data = inject(MockLibraryData);

  get(): Observable<UserSettingsResponse> {
    return defer(() => of(this.current())).pipe(delay(MOCK_LATENCY_MS.List));
  }

  update(request: UpdateUserSettingsRequest): Observable<UserSettingsResponse> {
    return defer(() => {
      if (request.trashRetentionDays !== undefined) {
        this.data.trashRetentionDays = request.trashRetentionDays;
      }
      if (request.folderColours !== undefined) {
        this.data.folderColours = request.folderColours;
      }
      return of(this.current());
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private current(): UserSettingsResponse {
    return {
      trashRetentionDays: this.data.trashRetentionDays,
      folderColours: this.data.folderColours,
    };
  }
}
