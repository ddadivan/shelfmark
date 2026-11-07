import { DestroyRef, inject, type Signal, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Whether a media query matches, kept current; `false` where `matchMedia` is missing. Injection context. */
export function mediaMatch(query: string): Signal<boolean> {
  const matches = signal(false);
  const list = inject(DOCUMENT).defaultView?.matchMedia?.(query);
  if (list) {
    matches.set(list.matches);
    const onChange = (event: MediaQueryListEvent): void => {
      matches.set(event.matches);
    };
    list.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => {
      list.removeEventListener('change', onChange);
    });
  }
  return matches.asReadonly();
}
