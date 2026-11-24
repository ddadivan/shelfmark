import { SAVED_WITHIN, SAVED_WITHIN_DAYS, type SavedWithin } from '@shelfmark/contracts';
import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
import { FAVORITE_QUERY_VALUE } from '../models/favorite-query-value.const';

const SAVED_VALUES: readonly string[] = Object.values(SAVED_WITHIN);

function isSavedWithin(value: unknown): value is SavedWithin {
  return typeof value === 'string' && SAVED_VALUES.includes(value);
}

/** The period of `?saved=`; an absent, repeated or unknown value is any time. */
export function parseSavedWithin(raw: unknown): SavedWithin | undefined {
  return isSavedWithin(raw) ? raw : undefined;
}

/** Whether `?fav=` turns "Only favorites" on (`1` only). */
export function parseFavoriteParam(raw: unknown): boolean {
  return raw === FAVORITE_QUERY_VALUE;
}

/** Whether a link saved at `createdAt` (ISO) falls in the period, counted back from `now`. */
export function savedWithin(createdAt: string, period: SavedWithin, now = Date.now()): boolean {
  return Date.parse(createdAt) >= now - SAVED_WITHIN_DAYS[period] * MS_PER_DAY;
}
