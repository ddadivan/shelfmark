import { Service } from '@angular/core';

/**
 * What to forget when the session ends (sign-out, expiry, a 401, a deleted account). Stores that
 * hold per-user state and depend on `AuthStore` register a callback here when they are created;
 * `AuthStore` calls `end()`. Stores that were never created have nothing to clear.
 */
@Service()
export class SessionScope {
  private readonly handlers = new Set<() => void>();

  /** Registers `handler`; returns a function that removes it. */
  onEnd(handler: () => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** Runs every registered handler; one that throws does not stop the others. */
  end(): void {
    for (const handler of this.handlers) {
      try {
        handler();
      } catch {
        // Clearing is best effort: the remaining stores must still be cleared.
      }
    }
  }
}
