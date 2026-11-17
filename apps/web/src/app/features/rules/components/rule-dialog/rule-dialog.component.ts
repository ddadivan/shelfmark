import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RULE_LIMIT } from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  InputComponent,
  NOTICE_KIND,
  NoticeComponent,
  PickerListComponent,
  TagInputComponent,
  type TagSuggestion,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { FoldersStore } from '../../../../stores/folders.store';
import { RecentFoldersStore } from '../../../../stores/recent-folders.store';
import { TagsStore } from '../../../../stores/tags.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { buildFolderPickerOptions } from '../../../links/utils/folder-picker-options';
import { RuleFormService } from '../../services/rule-form.service';

/**
 * Adds or edits a domain rule (#398): the domain (shown as stored once left), the folder from the
 * Move-to picker list (recent folders first; "No folder" keeps a link where it is saved) and up to
 * `RULE_LIMIT.TagsMax` tags. The form and save flow live in `RuleFormService`.
 */
@Component({
  selector: 'app-rule-dialog',
  imports: [
    ButtonComponent,
    DialogComponent,
    FormField,
    FormRoot,
    InputComponent,
    NoticeComponent,
    PickerListComponent,
    TagInputComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RuleFormService],
  templateUrl: './rule-dialog.component.html',
  styleUrl: './rule-dialog.component.scss',
})
export class RuleDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly RULE_LIMIT = RULE_LIMIT;

  protected readonly state = inject(RuleFormService);
  private readonly folders = inject(FoldersStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly tagStore = inject(TagsStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly recent = inject(RecentFoldersStore).targets;

  protected readonly form = this.state.form;
  /** Editing a rule whose folder is in Trash: the notice says the folder must be chosen again. */
  protected readonly trashedFolder = this.state.data.rule?.folderAvailable === false;

  protected readonly options = computed(() =>
    buildFolderPickerOptions(this.folders.entities(), (colour) =>
      this.settings.shownColour(colour),
    ),
  );

  protected readonly tagSuggestions = computed<TagSuggestion[]>(() => {
    activeLang();
    return this.tagStore.entities().map((tag) => ({
      name: tag.name,
      countLabel: this.transloco.translate(pluralKey('tags.count', tag.linkCount), {
        count: tag.linkCount,
      }),
    }));
  });

  constructor() {
    void this.folders.load();
    void this.tagStore.load();
  }
}
