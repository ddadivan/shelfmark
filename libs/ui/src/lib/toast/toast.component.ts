import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FolderIconComponent } from '../folder-icon/folder-icon.component';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import type { ToastFolder } from './models/toast-folder.interface';
import type { ToastKind } from './models/toast-kind.type';
import type { ToastShortcutKey } from './models/toast-shortcut-key.interface';
import { TOAST_KIND } from './models/toast-kind.const';
import { TOAST_KIND_ICON } from './models/toast-kind-icon.const';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * The toast view: a lead typed by kind (link thumbnail with a check, folder tile, tinted icon),
 * a title with a one-line detail, actions and a close button; with `countdown` a line runs down
 * along the bottom. It carries no live region and no timer; `ToastService` renders it inside the
 * persistent live regions. Hover, focus or touch inside it reports `pausedChange` so the owner can
 * hold the timer (the countdown line pauses with it).
 */
@Component({
  selector: 'ui-toast',
  imports: [IconComponent, FolderIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-toast',
    '[class]': 'kindClass()',
    '[class.ui-toast--paused]': 'paused()',
    '(pointerenter)': 'setHover(true)',
    '(pointerleave)': 'setHover(false)',
    '(pointercancel)': 'setHover(false)',
    '(focusin)': 'setFocus(true)',
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly TOAST_KIND = TOAST_KIND;
  protected readonly FOLDER_COLOUR = FOLDER_COLOUR;
  readonly kind = input<ToastKind>(TOAST_KIND.Info);
  readonly title = input.required<string>();
  /** The second line; truncates with an ellipsis. */
  readonly detail = input<string>();
  /** Preview image of a `saved` link; an icon stands in without it. */
  readonly thumb = input<string>();
  /** The tile of a `moved` toast. */
  readonly folder = input<ToastFolder>();
  /** Action button text; no button without it. */
  readonly actionLabel = input<string>();
  /** Text of the quieter second action; no button without it. */
  readonly secondaryLabel = input<string>();
  /** Accessible name of the close button. */
  readonly dismissLabel = input<string>('Dismiss');
  /** Milliseconds the countdown line runs (an Undo toast); 0 draws no line. */
  readonly countdown = input<number>(0);
  /** Visually hidden text read with the toast, e.g. how to reach the action by keyboard. */
  readonly actionHint = input<string>();
  /** Shortcut shown as small key caps before the action (not on phones); needs an action. */
  readonly shortcut = input<readonly ToastShortcutKey[]>([]);
  readonly action = output<void>();
  readonly secondaryAction = output<void>();
  readonly dismiss = output<void>();
  /** True while the pointer is over the toast or focus is inside it. */
  readonly pausedChange = output<boolean>();

  protected readonly kindClass = computed(() => `ui-toast--${this.kind()}`);
  protected readonly icon = computed<IconName>(() => TOAST_KIND_ICON[this.kind()]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private hovered = false;
  private focused = false;
  private isPaused = false;
  protected readonly paused = signal(false);

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
    if (next !== this.isPaused) {
      this.isPaused = next;
      this.paused.set(next);
      this.pausedChange.emit(next);
    }
  }
}
