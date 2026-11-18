import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AI_MEANING_LIMIT } from '../models/ai-meaning-limit.const';
import type { QueryCacheEntry as Entry } from '../models/query-cache-entry.interface';

/**
 * Query vectors of this instance (ADR 0052 point 6): an LRU of `AI_MEANING_LIMIT.CacheSize` entries
 * for `CacheTtlMs`, keyed by a SHA-256 of user id, model and the normalised query, so two users
 * never share an entry and the query text is not kept as a key. Memory only, nothing at rest.
 */
@Injectable()
export class QueryEmbeddingCache {
  private readonly entries = new Map<string, Entry>();

  key(userId: string, model: string, query: string): string {
    return createHash('sha256').update(`${userId}\n${model}\n${query}`, 'utf8').digest('hex');
  }

  get(key: string, now = Date.now()): string | null {
    const entry = this.entries.get(key);
    if (entry === undefined) return null;
    this.entries.delete(key);
    if (entry.expiresAt <= now) return null;
    this.entries.set(key, entry);
    return entry.vector;
  }

  set(key: string, vector: string, now = Date.now()): void {
    this.entries.delete(key);
    this.entries.set(key, { vector, expiresAt: now + AI_MEANING_LIMIT.CacheTtlMs });
    while (this.entries.size > AI_MEANING_LIMIT.CacheSize) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
