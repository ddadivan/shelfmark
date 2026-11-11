import { Service, signal } from '@angular/core';
import {
  isLibrarySort,
  isLibraryView,
  type LibrarySort,
  type LibraryView,
} from '@shelfmark/contracts';
import { FEED_MEMORY_LIMIT } from './models/feed-memory-limit.const';
import { FEED_MEMORY_STORAGE_KEY } from './models/feed-memory-storage-key.const';
import type { FeedMemoryEntry } from './models/feed-memory-entry.interface';

type FeedMemoryMap = Readonly<Record<string, FeedMemoryEntry>>;

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Reads the stored map; anything unexpected is dropped entry by entry. */
function read(): FeedMemoryMap {
  try {
    const parsed: unknown = JSON.parse(storage()?.getItem(FEED_MEMORY_STORAGE_KEY) ?? '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const map: Record<string, FeedMemoryEntry> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'object' || value === null) {
        continue;
      }
      const { view, sort } = value as Record<string, unknown>;
      const entry: FeedMemoryEntry = {
        ...(isLibraryView(view) && { view }),
        ...(isLibrarySort(sort) && { sort }),
      };
      if (entry.view !== undefined || entry.sort !== undefined) {
        map[key] = entry;
      }
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * The view (cards or list) and the sort each feed was last switched to on this device (#284,
 * Settings › Library: "Each folder remembers its own choice after you change it"). A feed is a
 * folder (by id) or one of the fixed lists (all, unsorted, favorites). Until a feed has its own
 * choice it opens with the account's Default view and Sort links by. Kept in `localStorage`, at
 * most `FEED_MEMORY_LIMIT` feeds (the least recently changed go first); blocked storage keeps the
 * choices for this session only.
 */
@Service()
export class FeedMemoryService {
  private readonly map = signal<FeedMemoryMap>(read());

  /** The view the feed was last switched to; `undefined` while it has none. */
  view(feed: string): LibraryView | undefined {
    return this.map()[feed]?.view;
  }

  /** The sort the feed was last switched to; `undefined` while it has none. */
  sort(feed: string): LibrarySort | undefined {
    return this.map()[feed]?.sort;
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
    try {
      storage()?.setItem(FEED_MEMORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be blocked; the choice then lasts for this session only.
    }
  }
}
