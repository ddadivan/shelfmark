import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { SAVED_VIEW_LIMIT, VIEW_DRAFT_FIELD } from '@shelfmark/contracts';
import {
  AiLineComponent,
  BUTTON_SIZE,
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogCancelDirective,
  DialogComponent,
  ICON_SIZE,
  IconComponent,
  InputComponent,
  NOTICE_KIND,
  NoticeComponent,
  SelectComponent,
  TagInputComponent,
} from '@shelfmark/ui';
import { FoldersStore } from '../../../../stores/folders.store';
import { TagsStore } from '../../../../stores/tags.store';
import { NewViewFormService } from '../../services/new-view-form.service';
import { NewViewOptionsService } from '../../services/new-view-options.service';
import { NewViewPhraseService } from '../../services/new-view-phrase.service';
import { NewViewPreviewService } from '../../services/new-view-preview.service';

/**
 * "+ Save view" (#535; Shelf `13-views` "New view"): one page for everyone. With AI on an optional
 * phrase sits on top and "Fill in" lets AI fill the rows (marked with a spark until changed) and
 * name the view; then the name, the "Show links where" rows (where, type, tags, words, sort) and
 * the live count. Opened by `SavedViewActionsService.saveCurrent`, which owns the saving.
 */
@Component({
  selector: 'app-new-view-dialog',
  imports: [
    AiLineComponent,
    ButtonComponent,
    DialogCancelDirective,
    DialogComponent,
    FormField,
    FormRoot,
    IconComponent,
    InputComponent,
    NgTemplateOutlet,
    NoticeComponent,
    SelectComponent,
    TagInputComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    NewViewFormService,
    NewViewOptionsService,
    NewViewPreviewService,
    NewViewPhraseService,
  ],
  templateUrl: './new-view-dialog.component.html',
  styleUrl: './new-view-dialog.component.scss',
})
export class NewViewDialogComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly FIELD = VIEW_DRAFT_FIELD;
  protected readonly TAGS_MAX = SAVED_VIEW_LIMIT.TagsMax;

  private readonly formState = inject(NewViewFormService);
  protected readonly options = inject(NewViewOptionsService);
  protected readonly preview = inject(NewViewPreviewService);
  protected readonly phrase = inject(NewViewPhraseService);

  protected readonly form = this.formState.form;
  protected readonly sparks = this.formState.sparks;
  protected readonly saving = this.formState.saving;
  protected readonly errorKey = this.formState.errorKey;

  constructor() {
    // Usually loaded by the sidebar already; the choices fill in when the lists arrive.
    void inject(FoldersStore).load();
    void inject(TagsStore).load();
  }

  protected cancel(): void {
    this.formState.cancel();
  }

  /** Enter in the phrase composes (it never saves: the rows come first). */
  protected onPhraseEnter(event: Event): void {
    event.preventDefault();
    void this.phrase.compose();
  }
}
