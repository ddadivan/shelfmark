import type { ToastItem } from '../models/toast-item.interface';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
} from '@angular/core';
import { TOAST_DISMISS_LABEL } from '../models/toast-dismiss-label.token';
import { TOAST_KIND } from '../models/toast-kind.const';
import { toastShortcutKeys } from '../../../services/toast/toast-shortcut-label';
import { ToastStore } from '../../../services/toast/toast-store';
import { ToastComponent } from '../toast.component';

/**
 * The persistent live regions that hold the toasts (internal; `ToastService` attaches this
 * component to the overlay once and never removes it, so a toast added later is announced). Two
 * regions, both always in the page: a polite `role="status"` for everything, and an assertive
 * `role="alert"` for `danger` toasts that report an error. A `danger` Undo toast (a delete the
 * user just made) is red but polite: it confirms the user's own action, it is not an error. Only additions are announced, a leaving toast is not read
 * again. The regions are layout-transparent (`display: contents`), so all toasts share one stack.
 */
/** Errors interrupt (`role="alert"`); a red Undo toast after a delete is announced politely. */
function isAssertive(item: ToastItem): boolean {
  return item.kind === TOAST_KIND.Danger && !item.undo;
}

@Component({
  selector: 'ui-toast-region',
  imports: [ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-toast-region',
    '(pointerenter)': 'measureLift()',
    '(focusin)': 'measureLift()',
  },
  templateUrl: './toast-region.component.html',
  styleUrl: './toast-region.component.scss',
})
export class ToastRegionComponent {
  protected readonly store = inject(ToastStore);
  protected readonly shortcut = toastShortcutKeys();
  protected readonly dismissLabel = inject(TOAST_DISMISS_LABEL);

  protected readonly polite = computed(() =>
    this.store.stack().filter((entry) => !isAssertive(entry.item)),
  );
  protected readonly assertive = computed(() =>
    this.store.stack().filter((entry) => isAssertive(entry.item)),
  );

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      this.store.stack();
      this.measureLift();
    });
  }

  /**
   * Fanning out moves each toast up by the heights of the newer toasts plus the gaps
   * (`--ui-toast-lift`), so the stack opens and closes with a transform transition instead of
   * jumping between one grid cell and a list. Heights come from `offsetHeight` (transforms do not
   * change it); measured after each stack change and again when the pointer or focus enters.
   */
  protected measureLift(): void {
    const host = this.host.nativeElement;
    const gap = Number.parseFloat(getComputedStyle(host).rowGap) || 0;
    const items = [
      ...host.querySelectorAll<HTMLElement>(
        '.ui-toast-region__item:not(.ui-toast-region__item--leave)',
      ),
    ].sort((a, b) => Number(a.dataset['depth']) - Number(b.dataset['depth']));
    let lift = 0;
    for (const item of items) {
      item.style.setProperty('--ui-toast-lift', `${lift}px`);
      lift += item.offsetHeight + gap;
    }
  }
}
