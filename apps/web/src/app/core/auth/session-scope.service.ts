import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { USER_STORAGE_KEYS } from './models/user-storage-keys.const';

/**
 * What to forget when the session ends (sign-out, expiry, a 401, a deleted account). Stores that
 * hold per-user state and depend on `AuthStore` register a callback here when they are created;
 * `AuthStore` calls `end()`. Stores that were never created have nothing to clear, which is also
 * why `AuthStore` does not import the library stores: they stay out of the initial bundle (#339).
 * The per-user keys in `localStorage` (`USER_STORAGE_KEYS`) are removed here too, whether or not
 * their owner was ever created.
 */
@Service()
export class SessionScope {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;
  private readonly handlers = new Set<() => void>();
  private readonly flushers = new Set<() => Promise<void>>();

  /** Registers `handler`; returns a function that removes it. */
  onEnd(handler: () => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Registers `flusher`, which sends work still waiting (deletes in their Undo window) while the
   * session is valid; returns a function that removes it.
   */
  beforeEnd(flusher: () => Promise<void>): () => void {
    this.flushers.add(flusher);
    return () => this.flushers.delete(flusher);
  }

  /** Runs every registered flusher; rejects when one does. */
  async flush(): Promise<void> {
    await Promise.all([...this.flushers].map((flusher) => flusher()));
  }

  /** Runs every registered handler; one that throws does not stop the others. */
  end(): void {
    for (const key of USER_STORAGE_KEYS) {
      try {
        this.storage?.removeItem(key);
      } catch {
        // Blocked storage (private mode) holds nothing to forget.
      }
    }
    for (const handler of this.handlers) {
      try {
        handler();
      } catch {
        // Clearing is best effort: the remaining stores must still be cleared.
      }
    }
  }
}
