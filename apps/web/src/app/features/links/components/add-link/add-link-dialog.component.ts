import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { LINK_LIMIT } from '@shelfmark/contracts';
import {
  ButtonComponent,
  CheckboxComponent,
  ChipComponent,
  DialogComponent,
  FaviconComponent,
  KEYBOARD_KEY,
  InputComponent,
  NoticeComponent,
  NOTICE_KIND,
  SelectComponent,
  SkeletonComponent,
  TagInputComponent,
  TextareaComponent,
  UiDialogRef,
  BUTTON_VARIANT,
  BUTTON_TYPE,
  INPUT_TYPE,
  SKELETON_SHAPE,
} from '@shelfmark/ui';
import { FoldersStore } from '../../../../stores/folders.store';
import { TagsStore } from '../../../../stores/tags.store';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { isMacPlatform } from '../../../search/utils/is-mac-platform';
import { ADD_LINK_ACTION } from '../../models/add-link-action.const';
import type { AddLinkResult } from '../../models/add-link-result.type';
import { PREVIEW_STATE } from '../../models/preview-state.const';
import { PasteManyListComponent } from '../paste-many/paste-many-list.component';
import { AddLinkFormService } from '../../services/add-link-form.service';
import { AddLinkSaveService } from '../../services/add-link-save.service';
import { AddLinkPreviewService } from '../../services/add-link-preview.service';
import { AddLinkRuleService } from '../../services/add-link-rule.service';
import { RuleSuggestionService } from '../../../rules/services/rule-suggestion.service';
import { AddSeveralLinksService } from '../../services/add-several-links.service';
import { AddLinkNewFolderService } from '../../services/add-link-new-folder.service';
import { AddLinkLabelsService } from '../../services/add-link-labels.service';
import { NEW_FOLDER_OPTION_ID } from '../../models/new-folder-option-id.const';
import { AddLinkAiService } from '../../services/add-link-ai.service';
import { AddLinkSummaryService } from '../../services/add-link-summary.service';
import { SummaryFieldComponent } from '../../../ai/components/summary-field/summary-field.component';
import { AiDraftService } from '../../../ai/services/ai-draft.service';
import { AiLinkStateService } from '../../../ai/services/ai-link-state.service';
import { AddLinkAiAppliedService } from '../../services/add-link-ai-applied.service';
import { AddLinkAiFillService } from '../../services/add-link-ai-fill.service';
import { AddLinkAiFillComponent } from '../add-link-ai/add-link-ai-fill.component';
import { AddLinkAiFolderComponent } from '../add-link-ai/add-link-ai-folder.component';
import { AddLinkAiTagsComponent } from '../add-link-ai/add-link-ai-tags.component';
import { RelatedLinksComponent } from '../../../ai/components/related-links/related-links.component';

/**
 * Content of the add-link dialog (`openAddLinkDialog()`): paste a URL, the preview fills the
 * title, choose folder, tags and note, save. Built on Signal Forms; limits and URL rule mirror
 * the contract. The preview shows text only (title, description, favicon fallback): images wait
 * for ADR 0027.
 *
 * The preview is an `rxResource` keyed by the valid URL, so a new URL cancels the old request
 * (the debounce is the `timer` inside the stream). Its result autofills the title until the user
 * edits it. A failed preview is not an error for saving: the link keeps its address as the title.
 *
 * Several links pasted into the address field (or handed over as `data.text` by ⌘V in the
 * library) turn the dialog into the paste-many list (`PasteManyListComponent`), which keeps the
 * folder and tags chosen so far and closes the dialog itself.
 *
 * Edit mode (`data.link`): the form is prefilled, the preview runs only after the URL changed and
 * serves the duplicate check alone (the link itself is not a duplicate), saving sends the changed
 * fields only, and Delete hands the link back to the caller (confirm and Undo live there).
 */
@Component({
  selector: 'app-add-link-dialog',
  imports: [
    AddLinkAiFillComponent,
    AddLinkAiFolderComponent,
    AddLinkAiTagsComponent,
    RelatedLinksComponent,
    ButtonComponent,
    CheckboxComponent,
    ChipComponent,
    DialogComponent,
    FaviconComponent,
    FormField,
    FormRoot,
    InputComponent,
    NoticeComponent,
    PasteManyListComponent,
    SelectComponent,
    SkeletonComponent,
    SummaryFieldComponent,
    TagInputComponent,
    TextareaComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AddLinkFormService,
    AddSeveralLinksService,
    AddLinkPreviewService,
    AddLinkRuleService,
    RuleSuggestionService,
    AddLinkSaveService,
    AddLinkNewFolderService,
    AiDraftService,
    AiLinkStateService,
    AddLinkAiService,
    AddLinkAiAppliedService,
    AddLinkAiFillService,
    AddLinkSummaryService,
    AddLinkLabelsService,
  ],
  templateUrl: './add-link-dialog.component.html',
  styleUrl: './add-link-dialog.component.scss',
})
export class AddLinkDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly INPUT_TYPE = INPUT_TYPE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly PREVIEW_STATE = PREVIEW_STATE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly LINK_LIMIT = LINK_LIMIT;
  /** Cmd (macOS) or Ctrl: the key of the "save" shortcut shown in the footer. */
  protected readonly mac = isMacPlatform();

  /** The phone sheet has no Cancel in add mode and no shortcut hint: not rendered there. */
  protected readonly phone = inject(ViewportService).phone;
  private readonly formState = inject(AddLinkFormService);
  private readonly folders = inject(FoldersStore);
  private readonly newFolder = inject(AddLinkNewFolderService);
  private readonly tagStore = inject(TagsStore);
  private readonly ref = inject<UiDialogRef<AddLinkResult>>(UiDialogRef);

  /** The link being edited; `undefined` when adding. */
  protected readonly original = this.formState.original;
  protected readonly editing = this.formState.editing;

  /** Paste many: its toggles, paste and keyboard handling are bound directly. */
  protected readonly severalLinks = inject(AddSeveralLinksService);
  protected readonly pasted = this.severalLinks.pasted;
  protected readonly several = this.severalLinks.several;
  protected readonly severalForm = this.severalLinks.severalForm;

  protected readonly form = this.formState.form;

  private readonly previewService = inject(AddLinkPreviewService);
  protected readonly fetchPages = this.previewService.fetchPages;
  protected readonly previewState = this.previewService.previewState;
  protected readonly shownState = this.previewService.shownState;
  protected readonly noPreview = this.previewService.noPreview;
  protected readonly previewData = this.previewService.previewData;
  protected readonly previewHost = this.previewService.previewHost;
  protected readonly duplicate = this.previewService.duplicate;

  /** Edit link: the summary field (#391). */
  protected readonly summary = inject(AddLinkSummaryService);

  private readonly ruleService = inject(AddLinkRuleService);
  /** "Rule: youtube.com → Videos" while a domain rule filled folder or tags (#398). */
  protected readonly ruleChip = this.ruleService.chip;

  /** The folders, plus one named in the field and created on Save ("New", #454). */
  protected readonly folderOptions = this.newFolder.options;
  /** The paste-many list has no pending folder: it starts in "Unsorted" then. */
  protected readonly pasteFolderId = computed(() => {
    const id = this.form.folderId().value();
    return id === NEW_FOLDER_OPTION_ID ? null : id;
  });
  private readonly labels = inject(AddLinkLabelsService);
  protected readonly kindOptions = this.labels.kindOptions;
  protected readonly tagSuggestions = this.labels.tagSuggestions;
  protected readonly reminder = this.labels.reminder;
  protected readonly meta = this.labels.meta;

  constructor() {
    // Usually loaded by the sidebar already; the options fill in when the list arrives.
    void this.folders.load();
    void this.tagStore.load();
  }

  private readonly aiFill = inject(AddLinkAiFillService);
  private readonly saveFlow = inject(AddLinkSaveService);
  protected readonly saving = this.saveFlow.saving;
  protected readonly saveError = this.saveFlow.saveError;

  protected openExisting(): void {
    const existing = this.duplicate();
    if (existing) {
      this.ref.close({ action: ADD_LINK_ACTION.OpenExisting, existing });
    }
  }

  /** Leaving the address shows it as it will be saved (`https://` added, #405). */
  protected onUrlBlur(): void {
    this.formState.normalizeUrlField();
  }

  /** "Create folder “X”" in the folder field: an existing folder of that name, else a new one. */
  protected onFolderCreated(name: string): void {
    const id = this.newFolder.choose(name);
    if (id !== null) {
      this.form.folderId().value.set(id);
    }
  }

  /**
   * Cmd / Ctrl + Enter saves from any field (Enter alone in a text field submits as before);
   * Alt / Option + Shift + F is "Fill in with AI" (F1c).
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.aiFill.handleShortcut(event)) {
      return;
    }
    if (event.key === KEYBOARD_KEY.Enter && (event.metaKey || event.ctrlKey) && !this.saving()) {
      event.preventDefault();
      (event.currentTarget as HTMLFormElement).requestSubmit();
    }
  }

  protected cancel(): void {
    this.ref.close();
  }

  /** "Remind me" / "Change": the caller opens the reminder dialog (unsaved edits are dropped, as Delete). */
  protected requestRemind(): void {
    if (this.original) {
      this.ref.close({ action: ADD_LINK_ACTION.Remind, link: this.original });
    }
  }

  /** The chip's remove: the rule leaves the form and focus goes to the folder it changed. */
  protected dismissRule(): void {
    this.ruleService.dismiss();
    this.form.folderId().focusBoundControl();
  }

  protected requestDelete(): void {
    if (this.original) {
      this.ref.close({ action: ADD_LINK_ACTION.Delete, link: this.original });
    }
  }
}
