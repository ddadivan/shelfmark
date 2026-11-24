import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  IconComponent,
  ICON_SIZE,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
} from '@shelfmark/ui';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { APP_PATH } from '../../../../models/app-path.const';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { safeHref } from '../../../links/utils/link-view';
import type { RemindOption } from '../../../reminders/models/remind-option.interface';
import { ReminderActionsService } from '../../../reminders/services/reminder-actions.service';
import { ReminderFormatService } from '../../../reminders/services/reminder-format.service';
import { remindPresets } from '../../../reminders/utils/remind-presets';
import { TodayThumbComponent } from '../today-thumb/today-thumb.component';

/**
 * "Back to these" of Today (Shelf): the due reminders, the longest due first. Each tile opens its
 * link; Done clears the reminder, Snooze offers the presets (a bottom sheet below 64em) or a date.
 * "Revisit" leads to the Revisit queue (Shelf). With nothing due it says so.
 */
@Component({
  selector: 'app-today-back',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonComponent,
    IconComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    TodayThumbComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './today-back.component.html',
  styleUrl: './today-back.component.scss',
})
export class TodayBackComponent {
  readonly links = input.required<readonly LinkResponse[]>();
  /** All due reminders (the tiles show the first few). */
  readonly count = input.required<number>();

  private readonly reminders = inject(ReminderActionsService);
  private readonly format = inject(ReminderFormatService);
  private readonly actions = inject(LinkActionsService);
  protected readonly newTab = inject(UserSettingsStore).openInNewTab;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly remindersHref = `/${APP_PATH.Revisit}`;
  protected readonly safeHref = safeHref;

  private readonly now = signal(Date.now());
  protected readonly snoozeOptions = computed(() => remindPresets(new Date(this.now())));

  /** "Due 3 hours ago". */
  protected why(link: LinkResponse): string {
    return link.remindAt === null ? '' : this.format.chip(link.remindAt, this.now());
  }

  protected hint(option: RemindOption): string {
    return this.format.when(option.at.toISOString(), this.now());
  }

  protected opened(link: LinkResponse): void {
    this.actions.open(link);
  }

  protected done(link: LinkResponse): void {
    void this.reminders.done(link);
  }

  protected snooze(link: LinkResponse, option: RemindOption): void {
    void this.reminders.snooze(link, option);
  }

  protected pick(link: LinkResponse): void {
    void this.reminders.remind([link]);
  }

  /** The presets are worked out when the menu opens, so "Later today" is still true. */
  protected refreshNow(): void {
    this.now.set(Date.now());
  }
}
