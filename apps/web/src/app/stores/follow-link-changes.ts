import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LinksStore } from './links.store';
import type { LinkChange } from './models/link-change.interface';

/**
 * Calls `onChange` for every write of `LinksStore` (`linkChanges`) until the owner is destroyed.
 * For stores that keep their own copy of links (Reminders, Today, Rediscover): they never write
 * links themselves, they follow the one writer. Call it in an injection context (a store's
 * `onInit`).
 */
export function followLinkChanges(onChange: (change: LinkChange) => void): void {
  inject(LinksStore)
    .linkChanges.pipe(takeUntilDestroyed(inject(DestroyRef)))
    .subscribe(onChange);
}
