import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import {
  BADGE_TONE,
  BadgeComponent,
  ButtonComponent,
  HistoryRowComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { linkHost, ownImageUrl, safeHref, siteLetter } from '../../../links/utils/link-view';
import type { RemindOption } from '../../models/remind-option.interface';
import { ReminderFormatService } from '../../services/reminder-format.service';

/**
 * One reminder on the Reminders page as a `ui-history-row`: the link (a press opens it), its site,
 * the time chip (amber once due) and the actions: Done and Snooze (the presets, or "Pick date and
 * time…"). Icon buttons on the mobile shell, so the row fits a 360px phone. It only renders and
 * emits; the page does the work.
 */
@Component({
  selector: 'app-reminder-row',
  imports: [
    TranslocoPipe,
    BadgeComponent,
    ButtonComponent,
    HistoryRowComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    TooltipDirective,
  ],
  templateUrl: './reminder-row.component.html',
  styleUrl: './reminder-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReminderRowComponent {
  protected readonly viewport = inject(ViewportService);
  protected readonly newTab = inject(UserSettingsStore).openInNewTab;
  private readonly format = inject(ReminderFormatService);
  protected readonly BADGE_TONE = BADGE_TONE;

  readonly link = input.required<LinkResponse>();
  /** The page's "now" (ms): every row agrees on what is due. */
  readonly now = input.required<number>();
  /** The snooze presets of the moment. */
  readonly snoozeOptions = input.required<readonly RemindOption[]>();

  readonly opened = output<void>();
  readonly doneRequested = output<void>();
  readonly snoozeRequested = output<RemindOption>();
  /** "Pick date and time…": the full dialog. */
  readonly changeRequested = output<void>();

  protected readonly href = computed(() => safeHref(this.link().url));
  protected readonly host = computed(() => linkHost(this.link().url));
  protected readonly letter = computed(() => siteLetter(this.link().url));
  protected readonly image = computed(() => ownImageUrl(this.link().imageUrl) ?? undefined);
  protected readonly due = computed(() => {
    const at = this.link().remindAt;
    return at !== null && this.format.isDue(at, this.now());
  });
  protected readonly chip = computed(() => {
    const at = this.link().remindAt;
    return at === null ? '' : this.format.chip(at, this.now());
  });

  protected hint(option: RemindOption): string {
    return this.format.when(option.at.toISOString(), this.now());
  }

  protected onActivated(event: MouseEvent): void {
    if (this.href() === undefined) {
      event.preventDefault();
      return;
    }
    this.opened.emit();
  }
}
