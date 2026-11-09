import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import type { ToastKind } from './models/toast-kind.type';
import type { ToastShortcutKey } from './models/toast-shortcut-key.interface';
import { TOAST_KIND } from './models/toast-kind.const';
import { TOAST_KIND_ICON } from './models/toast-kind-icon.const';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * The toast view: icon, text and an optional action. It carries no live region and no timer;
 * `ToastService` renders it inside the one persistent polite region. Hover or focus inside it
 * reports `pausedChange` so the owner can hold the timer.
 */
@Component({
  selector: 'ui-toast',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-toast',
    '[class]': 'kindClass()',
    '(pointerenter)': 'setHover(true)',
    '(pointerleave)': 'setHover(false)',
    '(focusin)': 'setFocus(true)',
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  readonly kind = input<ToastKind>(TOAST_KIND.Info);
  readonly text = input.required<string>();
  /** Action button text; no button without it. */
  readonly actionLabel = input<string>();
  /** Visually hidden text read with the toast, e.g. how to reach the action by keyboard. */
  readonly actionHint = input<string>();
  /** Shortcut shown as small key caps before the action (not on phones); needs an action. */
  readonly shortcut = input<readonly ToastShortcutKey[]>([]);
  readonly action = output<void>();
  /** True while the pointer is over the toast or focus is inside it. */
  readonly pausedChange = output<boolean>();

  protected readonly kindClass = computed(() => `ui-toast--${this.kind()}`);
  protected readonly icon = computed<IconName>(() => TOAST_KIND_ICON[this.kind()]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private hovered = false;
  private focused = false;
  private paused = false;

  protected setHover(value: boolean): void {
    this.hovered = value;
    this.report();
  }

  protected setFocus(value: boolean): void {
    this.focused = value;
    this.report();
  }

  protected onFocusOut(event: FocusEvent): void {
    const host = event.currentTarget as HTMLElement;
    if (!(event.relatedTarget instanceof Node && host.contains(event.relatedTarget))) {
      this.setFocus(false);
    }
  }

  constructor() {
    // A toast that appears under a resting pointer (it replaced one) gets no pointerenter.
    afterNextRender(() => {
      if (this.host.matches(':hover')) {
        this.setHover(true);
      }
    });
  }

  private report(): void {
    const next = this.hovered || this.focused;
    if (next !== this.paused) {
      this.paused = next;
      this.pausedChange.emit(next);
    }
  }
}
