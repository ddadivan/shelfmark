import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, type Signal, signal } from '@angular/core';

/** Whether the tab is visible (`visibilityState` is not `hidden`), kept current. Injection context; the listener goes with it. */
export function pageVisible(): Signal<boolean> {
  const doc = inject(DOCUMENT);
  const visible = signal(doc.visibilityState !== 'hidden');
  const onChange = (): void => {
    visible.set(doc.visibilityState !== 'hidden');
  };
  doc.addEventListener('visibilitychange', onChange);
  inject(DestroyRef).onDestroy(() => {
    doc.removeEventListener('visibilitychange', onChange);
  });
  return visible.asReadonly();
}
