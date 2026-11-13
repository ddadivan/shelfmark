import { inject, Service } from '@angular/core';
import { AUTH_PROVIDER, type MeStatsQuery, type MeStatsResponse } from '@shelfmark/contracts';
import { defer, delay, type Observable, of } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import { MOCK_LINKS_SCENARIO } from '../../links/models/mock-links-scenario.const';
import { MOCK_LINKS_SCENARIO_KEY } from '../../links/models/mock-links-scenario-key.const';
import type { MeStatsApi } from '../models/me-stats-api.interface';
import { buildMockStats } from './build-mock-stats';
import { MOCK_MEMBER_SINCE } from './models/mock-member-since.const';

/** The `empty` links scenario: a new account with nothing saved. */
function emptyScenario(): boolean {
  try {
    return globalThis.sessionStorage.getItem(MOCK_LINKS_SCENARIO_KEY) === MOCK_LINKS_SCENARIO.Empty;
  } catch {
    return false;
  }
}

/**
 * `MeStatsApi` over the shared in-memory library, with simulated latency. A regular mock account
 * is connected with Google since it joined; a demo account has no provider (like the API). The
 * `empty` links scenario (`sm-mock-links-scenario`) answers a new account with nothing saved.
 */
@Service()
export class MockMeStatsApi implements MeStatsApi {
  private readonly data = inject(MockLibraryData);
  private readonly auth = inject(AuthStore);

  get(query: MeStatsQuery = {}): Observable<MeStatsResponse> {
    return defer(() => {
      const empty = emptyScenario();
      const demo = this.auth.user()?.isDemo ?? false;
      return of(
        buildMockStats({
          links: empty ? [] : this.data.links,
          folderCount: empty ? 0 : this.data.folderList.length,
          now: new Date(),
          firstDay: query.firstDay,
          memberSince: MOCK_MEMBER_SINCE,
          connectedAccounts: demo
            ? []
            : [{ provider: AUTH_PROVIDER.Google, connectedAt: MOCK_MEMBER_SINCE }],
        }),
      );
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }
}
