import { ChangeDetectionStrategy, Component, ElementRef, inject, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  ICON_SIZE,
  IconComponent,
} from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { BackfillReminderService } from '../../services/backfill-reminder.service';

/**
 * The quiet row under the search results (hotfix 2.2.1): "AI hasn't read N older links yet" with
 * Process and × Hide, then "Processing started" for a moment (`BackfillReminderService`). It sits
 * in the command list's `note` slot, outside the listbox, so it is never an option.
 *
 * Keyboard: the buttons follow the field in the tab order; a press that takes them away while they
 * have focus hands it back to the field (`leave`).
 */
@Component({
  selector: 'app-backfill-reminder',
  imports: [TranslocoPipe, ButtonComponent, IconComponent],
  templateUrl: './backfill-reminder.component.html',
  styleUrl: './backfill-reminder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackfillReminderComponent {
  /** Focus goes back to the search field. */
  readonly leave = output<void>();

  protected readonly reminder = inject(BackfillReminderService);
  private readonly locale = inject(LocaleService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly pluralKey = pluralKey;

  protected formatted(count: number): string {
    return this.locale.formatNumber(count);
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

  private hasFocus(): boolean {
    return this.host.contains(this.host.ownerDocument.activeElement);
  }
}
