import { Service, signal } from '@angular/core';

/**
 * Tells the Ask conversation list that the server's history changed (a turn was stored, a
 * conversation was deleted elsewhere): `AskStore` bumps `version`, `AskHistoryStore` reloads.
 * No dependencies, so an `AskStore` works where no list (and no history API) exists.
 */
@Service()
export class AskHistoryChanges {
  private readonly versionState = signal(0);
  readonly version = this.versionState.asReadonly();

  notify(): void {
    this.versionState.update((value) => value + 1);
  }
}
