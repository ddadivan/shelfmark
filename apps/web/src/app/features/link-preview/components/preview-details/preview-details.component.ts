import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SUMMARY_SOURCE, type LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  ChipComponent,
  FolderIconComponent,
  ICON_SIZE,
  IconComponent,
  TextareaComponent,
} from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { FoldersStore } from '../../../../stores/folders.store';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { ReminderFormatService } from '../../../reminders/services/reminder-format.service';
import { LinkInlineEditService } from '../../services/link-inline-edit.service';

/**
 * The details panel of the Link page (Shelf `01-library.html`, Details): title and note edited in
 * place (saved on blur), the folder (Move), the tags (Add tag opens Edit link), the reminder, the
 * summary, the address and when it was saved and last opened. Beside the page from 64em, under it
 * on a phone.
 */
@Component({
  selector: 'app-preview-details',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ChipComponent,
    FolderIconComponent,
    IconComponent,
    TextareaComponent,
  ],
  templateUrl: './preview-details.component.html',
  styleUrl: './preview-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewDetailsComponent {
  readonly link = input.required<LinkResponse>();

  protected readonly actions = inject(LinkActionsService);
  private readonly edits = inject(LinkInlineEditService);
  private readonly folders = inject(FoldersStore);
  private readonly reminders = inject(ReminderFormatService);
  private readonly locale = inject(LocaleService);
  protected readonly ICON_SIZE = ICON_SIZE;

  /** The fields show the saved text again whenever the link changes. */
  protected readonly title = linkedSignal(() => this.link().title);
  protected readonly note = linkedSignal(() => this.link().note ?? '');

  protected readonly folder = computed(() => {
    const id = this.link().folderId;
    return id === null ? null : (this.folders.entityMap()[id] ?? null);
  });
  protected readonly reminder = computed(() => {
    this.locale.lang();
    const at = this.link().remindAt;
    return at === null ? null : this.reminders.when(at);
  });
  protected readonly aiSummary = computed(() => this.link().summarySource === SUMMARY_SOURCE.Ai);
  protected readonly saved = computed(() => {
    this.locale.lang();
    return this.locale.formatDate(this.link().createdAt);
  });
  protected readonly opened = computed(() => {
    this.locale.lang();
    const at = this.link().lastOpenedAt;
    return at === null ? null : this.locale.formatRelative(at, Date.now());
  });

  protected async saveTitle(): Promise<void> {
    if (!(await this.edits.saveTitle(this.link(), this.title()))) {
      this.title.set(this.link().title);
    }
  }

  protected async saveNote(): Promise<void> {
    await this.edits.saveNote(this.link(), this.note());
  }
}
