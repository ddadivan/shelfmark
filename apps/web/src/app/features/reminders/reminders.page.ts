import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  EmptyStateComponent,
  HistoryGroupComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { pluralKey } from '../../core/i18n/plural-key';
import { ViewportService } from '../../core/layout/viewport.service';
import { APP_PATH } from '../../models/app-path.const';
import { RemindersStore } from '../../stores/reminders.store';
import { LinkActionsService } from '../links/services/link-actions.service';
import { ReminderRowComponent } from './components/reminder-row/reminder-row.component';
import type { RemindOption } from './models/remind-option.interface';
import { REMINDER_GROUP } from './models/reminder-group.const';
import { ReminderActionsService } from './services/reminder-actions.service';
import { reminderSections } from './utils/reminder-sections';
import { remindPresets } from './utils/remind-presets';

/** Placeholders shown while the list loads. */
const SKELETON_COUNT = 4;

/**
 * `/reminders` (#275, Reminders mockup): the links whose reminder has come ("Due") and the
 * upcoming ones by day (Today, Tomorrow, This week, Later). Each row opens its link, and has Done
 * (clears the reminder) and Snooze (a preset, or the date picker). The list is the server's; due-ness
 * is computed there, and the page's "now" moves a reminder that passed while it was open to Due.
 */
@Component({
  selector: 'app-reminders-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    EmptyStateComponent,
    HistoryGroupComponent,
    ReminderRowComponent,
    SkeletonComponent,
  ],
  templateUrl: './reminders.page.html',
  styleUrl: './reminders.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RemindersPage {
  protected readonly store = inject(RemindersStore);
  protected readonly actions = inject(ReminderActionsService);
  private readonly links = inject(LinkActionsService);
  protected readonly viewport = inject(ViewportService);
  private readonly router = inject(Router);

  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;
  protected readonly pluralKey = pluralKey;
  protected readonly libraryHref = `/${APP_PATH.Library}`;

  /** One "now" for the page; the actions renew it, so a snoozed row lands in the right group. */
  protected readonly now = signal(Date.now());
  protected readonly snoozeOptions = computed(() => remindPresets(new Date(this.now())));
  protected readonly sections = computed(() =>
    reminderSections(this.store.due(), this.store.upcoming(), new Date(this.now())),
  );
  protected readonly dueCount = computed(
    () =>
      this.sections().find((section) => section.group === REMINDER_GROUP.Due)?.links.length ?? 0,
  );
  protected readonly total = computed(() => this.store.due().length + this.store.upcoming().length);

  constructor() {
    void this.store.open();
  }

  protected open(link: LinkResponse): void {
    this.links.open(link);
  }

  protected async done(link: LinkResponse): Promise<void> {
    await this.actions.done(link);
    this.now.set(Date.now());
  }

  protected async snooze(link: LinkResponse, option: RemindOption): Promise<void> {
    await this.actions.snooze(link, option);
    this.now.set(Date.now());
  }

  protected async change(link: LinkResponse): Promise<void> {
    await this.actions.remind([link]);
    this.now.set(Date.now());
  }

  protected async goToLibrary(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.libraryHref);
  }

  protected retry(): void {
    void this.store.load();
  }
}
