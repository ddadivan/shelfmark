import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  REDISCOVER_LIMIT,
  REDISCOVER_MODE,
  type LinkResponse,
  type RediscoverResponse,
} from '@shelfmark/contracts';
import { defer, delay, of, throwError, type Observable } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { RediscoverApi } from '../models/rediscover-api.interface';
import { isoWeek } from '../utils/iso-week';
import type { MockRediscoverState } from './models/mock-rediscover-state.interface';
import { MOCK_REDISCOVER_STORAGE_KEY } from './models/mock-rediscover-storage-key.const';

function read(): MockRediscoverState {
  try {
    const parsed: unknown = JSON.parse(
      globalThis.localStorage.getItem(MOCK_REDISCOVER_STORAGE_KEY) ?? '{}',
    );
    if (typeof parsed === 'object' && parsed !== null) {
      const state = parsed as Partial<Record<keyof MockRediscoverState, unknown>>;
      return {
        dismissedWeek: typeof state.dismissedWeek === 'string' ? state.dismissedWeek : null,
        hidden: Array.isArray(state.hidden)
          ? state.hidden.filter((id): id is string => typeof id === 'string')
          : [],
      };
    }
  } catch {
    // Missing, blocked or broken storage: the defaults.
  }
  return { dismissedWeek: null, hidden: [] };
}

function write(state: MockRediscoverState): void {
  try {
    globalThis.localStorage.setItem(MOCK_REDISCOVER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the change lasts until the next read.
  }
}

/** A cheap stable hash for the weekly order (the API uses `md5(link_id || iso_week)`). */
function weeklyRank(id: string, week: string): number {
  let hash = 2166136261;
  for (const char of id + week) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

/**
 * Rediscover over the mock library (mock builds only), in the API's `forgotten` mode: live links
 * saved at least 30 days ago, never opened or not for 90 days, without a future reminder and not
 * hidden, in a weekly order, 3 to 5 of them; nothing when dismissed this week. Never `theme`.
 */
@Service()
export class MockRediscoverApi implements RediscoverApi {
  private readonly library = inject(MockLibraryData);

  getBlock(): Observable<RediscoverResponse> {
    return defer(() => of(this.block(Date.now()))).pipe(delay(MOCK_LATENCY_MS.List));
  }

  dismiss(): Observable<void> {
    return defer(() => {
      write({ ...read(), dismissedWeek: isoWeek(Date.now()) });
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  hide(linkId: string): Observable<void> {
    return defer(() => {
      if (!this.library.links.some((link) => link.id === linkId)) {
        return throwError(() => mockHttpError(HttpStatusCode.NotFound));
      }
      const state = read();
      write({ ...state, hidden: [...new Set([...state.hidden, linkId])] });
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private block(now: number): RediscoverResponse {
    const week = isoWeek(now);
    const state = read();
    const empty: RediscoverResponse = { week, mode: null, theme: null, items: [] };
    if (state.dismissedWeek === week) {
      return empty;
    }
    const hidden = new Set(state.hidden);
    const savedBefore = now - REDISCOVER_LIMIT.SavedDaysMin * MS_PER_DAY;
    const openedBefore = now - REDISCOVER_LIMIT.OpenedDaysMin * MS_PER_DAY;
    const candidates = this.library.links.filter(
      (link: LinkResponse) =>
        !hidden.has(link.id) &&
        Date.parse(link.createdAt) <= savedBefore &&
        (link.lastOpenedAt === null || Date.parse(link.lastOpenedAt) <= openedBefore) &&
        (link.remindAt === null || Date.parse(link.remindAt) <= now),
    );
    if (candidates.length < REDISCOVER_LIMIT.ItemsMin) {
      return empty;
    }
    const items = candidates
      .toSorted(
        (a, b) =>
          weeklyRank(a.id, week) - weeklyRank(b.id, week) ||
          Date.parse(a.createdAt) - Date.parse(b.createdAt),
      )
      .slice(0, REDISCOVER_LIMIT.ItemsMax)
      .map((link) => this.library.linkView(link));
    return { week, mode: REDISCOVER_MODE.Forgotten, theme: null, items };
  }
}
