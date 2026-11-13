import { linkedSignal } from '@angular/core';

/**
 * True once `ready` has been true: a reload (Retry) flips `error` off for a moment and must not
 * remove a section that is already on screen (its component loads its own data when created).
 */
export function latched(ready: () => boolean) {
  return linkedSignal<boolean, boolean>({
    source: ready,
    computation: (now, previous) => now || (previous?.value ?? false),
  });
}
