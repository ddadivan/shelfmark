import { inject, Service, signal } from '@angular/core';
import {
  isLibrarySort,
  isLibraryView,
  type LibrarySort,
  type LibraryView,
} from '@shelfmark/contracts';
import { FEED_MEMORY_LIMIT } from '../models/feed-memory-limit.const';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import type { FeedMemoryEntry } from '../models/feed-memory-entry.interface';
import { CARD_FIELD } from '../models/card-field.const';
import type { CardField } from '../models/card-field.type';
import type { CardFields } from '../models/card-fields.type';
import { GRID_COLUMNS } from '../models/grid-columns.const';

type FeedMemoryMap = Readonly<Record<string, FeedMemoryEntry>>;

const FIELDS: readonly CardField[] = Object.values(CARD_FIELD);

/** A whole Grid size step, 1 to the number of steps. */
function isGridStep(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= GRID_COLUMNS.length;
}

/** The stored card fields: only known names with boolean values; `undefined` when none are left. */
function readFields(value: unknown): CardFields | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const fields: Partial<Record<CardField, boolean>> = {};
  for (const name of FIELDS) {
    const shown: unknown = (value as Record<string, unknown>)[name];
    if (typeof shown === 'boolean') {
      fields[name] = shown;
    }
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

/** Reads the stored map; anything unexpected is dropped entry by entry. */
function isStoredMap(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function read(storage: SafeStorage): FeedMemoryMap {
  const parsed = storage.getJson<object>(STORAGE_KEY.FeedMemory, isStoredMap, {});
  const map: Record<string, FeedMemoryEntry> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'object' || value === null) {
      continue;
    }
    const { view, sort, grid, fields } = value as Record<string, unknown>;
    const shownFields = readFields(fields);
    const entry: FeedMemoryEntry = {
      ...(isLibraryView(view) && { view }),
      ...(isLibrarySort(sort) && { sort }),
      ...(isGridStep(grid) && { grid }),
      ...(shownFields && { fields: shownFields }),
    };
    if (Object.keys(entry).length > 0) {
      map[key] = entry;
    }
  }
  return map;
}

/**
 * The view (masonry, cards or list), the sort, the Grid size and the card fields each feed was
 * last switched to on this device (#284, Shelf ViewMenu;
 * Settings › Library: "Each folder remembers its own choice after you change it"). A feed is a
 * folder (by id) or one of the fixed lists (all, unsorted, favorites). Until a feed has its own
 * choice it opens with the account's Default view and Sort links by. Kept in `localStorage`, at
 * most `FEED_MEMORY_LIMIT` feeds (the least recently changed go first); blocked storage keeps the
 * choices for this session only.
 */
@Service()
export class FeedMemoryService {
  private readonly storage = inject(SafeStorage);
  private readonly map = signal<FeedMemoryMap>(read(this.storage));

  /** The view the feed was last switched to; `undefined` while it has none. */
  view(feed: string): LibraryView | undefined {
    return this.map()[feed]?.view;
  }

  /** The sort the feed was last switched to; `undefined` while it has none. */
  sort(feed: string): LibrarySort | undefined {
    return this.map()[feed]?.sort;
  }

  /** The Grid size step the feed was last set to; `undefined` while it has none. */
  grid(feed: string): number | undefined {
    return this.map()[feed]?.grid;
  }

  /** The card fields the feed turned on or off; `undefined` while it has none. */
  fields(feed: string): CardFields | undefined {
    return this.map()[feed]?.fields;
  }

  /** Remembers a choice for the feed (merged with the other one it may have). */
  remember(feed: string, choice: FeedMemoryEntry): void {
    const { [feed]: current, ...others } = this.map();
    const entries = Object.entries(others);
    const kept = entries.slice(Math.max(0, entries.length - (FEED_MEMORY_LIMIT - 1)));
    const next: FeedMemoryMap = {
      ...Object.fromEntries(kept),
      [feed]: { ...current, ...choice },
    };
    this.map.set(next);
    // Storage can be blocked; the choice then lasts for this session only.
    this.storage.setJson(STORAGE_KEY.FeedMemory, next);
  }
}
