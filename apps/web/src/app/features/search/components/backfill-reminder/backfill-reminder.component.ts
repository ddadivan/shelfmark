import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  ICON_SIZE,
  IconComponent,
  KEYBOARD_KEY,
} from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { BackfillReminderService } from '../../services/backfill-reminder.service';

/**
 * The quiet row under the search results (hotfix 2.2.1): "AI hasn't read N older links yet" with
 * Process and × Hide, then "Processing started" for a moment (`BackfillReminderService`). It sits
 * in the command list's `note` slot, outside the listbox, so it is never an option.
 *
 * Keyboard: in the search dialog the buttons follow the field in the tab order. In the header
 * panel (`popup`, an overlay away from the field) the field's Tab calls `focusFirst()`; Shift+Tab
 * on Process, Tab on Hide and Esc hand focus back to the field (`leave`), as does a press that
 * takes the buttons away.
 */
@Component({
  selector: 'app-backfill-reminder',
  imports: [TranslocoPipe, ButtonComponent, IconComponent],
  templateUrl: './backfill-reminder.component.html',
  styleUrl: './backfill-reminder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKeydown($event)' },
})
export class BackfillReminderComponent {
  /** The header panel: focus moves between the field and the row by script. */
  readonly popup = input(false, { transform: booleanAttribute });
  /** Focus goes back to the search field. */
  readonly leave = output<void>();

  protected readonly reminder = inject(BackfillReminderService);
  private readonly locale = inject(LocaleService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly actions = viewChild<ElementRef<HTMLElement>>('actions');

  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly pluralKey = pluralKey;

  protected formatted(count: number): string {
    return this.locale.formatNumber(count);
  }

  /** Focuses Process; false when it is not on screen (hidden, confirming, panel closed). */
  focusFirst(): boolean {
    const first = this.buttons()[0];
    if (!first?.isConnected) {
      return false;
    }
    first.focus();
    return this.host.ownerDocument.activeElement === first;
  }

  protected async process(): Promise<void> {
    const focused = this.hasFocus();
    if ((await this.reminder.process()) && focused) {
      this.leave.emit();
    }
  }

  protected hide(): void {
    const focused = this.hasFocus();
    this.reminder.dismiss();
    if (focused) {
      this.leave.emit();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.popup()) {
      return;
    }
    const buttons = this.buttons();
    const index = buttons.findIndex((button) => button === event.target);
    const back =
      event.key === KEYBOARD_KEY.Escape ||
      (event.key === KEYBOARD_KEY.Tab && event.shiftKey && index === 0) ||
      (event.key === KEYBOARD_KEY.Tab && !event.shiftKey && index === buttons.length - 1);
    if (index >= 0 && back) {
      event.preventDefault();
      event.stopPropagation();
      this.leave.emit();
    }
  }

  private buttons(): HTMLElement[] {
    return Array.from(this.actions()?.nativeElement.querySelectorAll('button') ?? []);
  }

  private hasFocus(): boolean {
    return this.host.contains(this.host.ownerDocument.activeElement);
  }
}
