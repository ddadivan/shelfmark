import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  DatePickerComponent,
  DialogComponent,
  INPUT_TYPE,
  InputComponent,
  injectDialogData,
  NOTICE_KIND,
  NoticeComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { remindAtProblem } from '@shelfmark/contracts';
import { LocaleService } from '../../../../core/i18n/locale.service';
import type { RemindDialogData } from '../../models/remind-dialog-data.interface';
import type { RemindDialogResult } from '../../models/remind-dialog-result.interface';
import type { RemindOption } from '../../models/remind-option.interface';
import { ReminderFormatService } from '../../services/reminder-format.service';
import { composeRemindAt } from '../../utils/compose-remind-at';
import { remindPresets } from '../../utils/remind-presets';
import { localIsoDay } from '../../utils/local-iso-day';

const DEFAULT_TIME = '09:00';

/**
 * "Remind me" (Reminders, MobileReminders): the presets act at once (Later today, Tomorrow, This
 * weekend, Next week, In a month, each with its time); "Pick date and time…" shows the calendar
 * (`ui-date-picker`, from today) and an optional time (9:00 when left empty), with the time zone
 * the times are in. A link that has a reminder can remove it. Closes with the chosen time or
 * `null` (remove); dismissing changes nothing. A sheet on the phone (the dialog service).
 */
@Component({
  selector: 'app-remind-dialog',
  imports: [
    ButtonComponent,
    DatePickerComponent,
    DialogComponent,
    InputComponent,
    NoticeComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './remind-dialog.component.html',
  styleUrl: './remind-dialog.component.scss',
})
export class RemindDialogComponent {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly INPUT_TYPE = INPUT_TYPE;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  private readonly ref = inject<UiDialogRef<RemindDialogResult>>(UiDialogRef);
  protected readonly data = injectDialogData<RemindDialogData>();
  protected readonly locale = inject(LocaleService);
  protected readonly format = inject(ReminderFormatService);

  /** One "now" for the dialog: the presets and their hints agree. */
  private readonly now = new Date();
  protected readonly today = localIsoDay(this.now);
  protected readonly presets = remindPresets(this.now);
  protected readonly timeZone = this.format.timeZone();
  protected readonly currentLabel = computed(() =>
    this.data.current ? this.format.when(this.data.current, this.now.getTime()) : null,
  );

  /** The calendar and the time field are open. */
  protected readonly picking = signal(false);
  protected readonly day = signal<string | null>(null);
  protected readonly time = signal(DEFAULT_TIME);
  /** The picked moment, or `null` while no day is picked or the time cannot be read. */
  protected readonly picked = computed(() => {
    const day = this.day();
    return day === null ? null : composeRemindAt(day, this.time(), DEFAULT_TIME);
  });
  /** The picked moment has passed (today, earlier than now). */
  protected readonly pickedInPast = computed(() => {
    const picked = this.picked();
    return picked !== null && remindAtProblem(picked.toISOString(), Date.now()) !== null;
  });
  protected readonly pickedLabel = computed(() => {
    const picked = this.picked();
    return picked && !this.pickedInPast() ? this.format.when(picked.toISOString()) : null;
  });

  protected hint(option: RemindOption): string {
    return this.format.when(option.at.toISOString(), this.now.getTime());
  }

  protected choose(option: RemindOption): void {
    this.ref.close({ remindAt: option.at.toISOString() });
  }

  protected startPicking(): void {
    this.day.update((day) => day ?? this.today);
    this.picking.set(true);
  }

  protected confirmPicked(): void {
    const picked = this.picked();
    if (picked && !this.pickedInPast()) {
      this.ref.close({ remindAt: picked.toISOString() });
    }
  }

  protected remove(): void {
    this.ref.close({ remindAt: null });
  }

  protected cancel(): void {
    this.ref.close();
  }
}
