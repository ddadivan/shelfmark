import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import type { ToastKind } from './models/toast-kind.type';

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
    '[class.ui-toast--success]': "kind() === 'success'",
    '[class.ui-toast--error]': "kind() === 'error'",
    '(pointerenter)': 'setHover(true)',
    '(pointerleave)': 'setHover(false)',
    '(focusin)': 'setFocus(true)',
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  readonly kind = input<ToastKind>('info');
  readonly text = input.required<string>();
  /** Action button text; no button without it. */
  readonly actionLabel = input<string>();
  readonly action = output<void>();
  /** True while the pointer is over the toast or focus is inside it. */
  readonly pausedChange = output<boolean>();

  protected readonly icon = computed<IconName>(() => {
    const kind = this.kind();
    return kind === 'success' ? 'check' : kind === 'error' ? 'error' : 'info';
  });

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

  private report(): void {
    const next = this.hovered || this.focused;
    if (next !== this.paused) {
      this.paused = next;
      this.pausedChange.emit(next);
    }
  }
}
