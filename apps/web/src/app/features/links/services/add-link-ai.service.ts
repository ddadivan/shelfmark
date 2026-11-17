import { computed, effect, inject, Injector, Service, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import {
  AI_APPLIED_PART,
  LINK_LIMIT,
  normalizeTagName,
  SUGGESTION_KIND,
  type AiAppliedPart,
  type LinkSuggestion,
} from '@shelfmark/contracts';
import { TOAST_KIND, ToastService, UiDialogRef } from '@shelfmark/ui';
import { LocaleService } from '../../../core/i18n/locale.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { APP_PATH } from '../../../models/app-path.const';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import type { AiChipView } from '../../ai/components/suggestion-rows/models/ai-chip-view.interface';
import { AI_DRAFT_STATE } from '../../ai/models/ai-draft-state.const';
import { AiDraftService } from '../../ai/services/ai-draft.service';
import { AiLinkStateService } from '../../ai/services/ai-link-state.service';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { aiResetDate } from '../../ai/utils/ai-reset-date';
import { SETTINGS_PATH } from '../../settings/models/settings-path.const';
import type { AddLinkResult } from '../models/add-link-result.type';
import type { AiLineView } from '../models/ai-line-view.interface';
import { PREVIEW_STATE } from '../models/preview-state.const';
import { AddLinkFormService } from './add-link-form.service';
import { AddLinkPreviewService } from './add-link-preview.service';

function tagKey(name: string): string {
  return normalizeTagName(name).toLowerCase();
}

/**
 * AI suggestions in the add-link dialog (provided by the dialog, `AiTags` mockup). Adding: once
 * the preview of an address has loaded, `AiDraftService` asks for a draft; the save sends its id.
 * Editing: `AiLinkStateService` brings the link's open suggestions and what Automatic mode applied
 * ("Moved by AI" with Undo). Builds the chips of the folder and tags rows (a folder the user chose
 * turns the folder row into "Also fits"; tags already in the field are left out), applies a taken
 * chip to the form and the one AI line (limit, or "not available" with Try again once). Nothing at
 * all while AI is off.
 */
@Service({ autoProvided: false })
export class AddLinkAiService {
  private readonly formState = inject(AddLinkFormService);
  private readonly previewService = inject(AddLinkPreviewService);
  private readonly draft = inject(AiDraftService);
  private readonly linkState = inject(AiLinkStateService);
  private readonly settings = inject(AiSettingsStore);
  private readonly folders = inject(FoldersStore);
  private readonly userSettings = inject(UserSettingsStore);
  private readonly injector = inject(Injector);
  private readonly locale = inject(LocaleService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly ref = inject<UiDialogRef<AddLinkResult>>(UiDialogRef);
  private readonly editing = this.formState.editing;

  /** The rows show only while AI is on. */
  readonly on = this.settings.isOn;
  /** An Undo of "Moved by AI" runs, by part. */
  readonly undoing = signal<AiAppliedPart | null>(null);

  private readonly suggestions = computed<readonly LinkSuggestion[]>(() =>
    this.on() ? (this.editing ? this.linkState.suggestions() : this.draft.suggestions()) : [],
  );

  /** The skeleton row while the draft is asked for (adding only). */
  readonly loading = computed(
    () => this.on() && !this.editing && this.draft.state() === AI_DRAFT_STATE.Loading,
  );

  /** The folder chip, unless the field already holds that folder or the folder is gone. */
  readonly folderChips = computed<AiChipView[]>(() => {
    this.formState.i18n();
    const chosen = this.formState.model().folderId;
    return this.suggestions().flatMap((item) => {
      const folder = item.folderId === null ? undefined : this.folders.entityMap()[item.folderId];
      if (item.kind !== SUGGESTION_KIND.Folder || !folder || folder.id === chosen) {
        return [];
      }
      const name = folder.name;
      return [
        {
          id: item.id,
          kind: item.kind,
          label: name,
          ariaLabel: this.t('ai.suggest.moveTo', { name }),
          dismissLabel: this.t('ai.suggest.dismiss', { name }),
          acceptedMessage: this.t('ai.suggest.folderChosen', { name }),
          folderColour: this.userSettings.shownColour(folder.colour),
          folderIcon: folder.icon,
        },
      ];
    });
  });

  /** "Also fits" once a folder is chosen (the user's choice wins), else "Suggested". */
  readonly folderRowLabel = computed(() =>
    this.t(this.formState.model().folderId === null ? 'ai.suggest.label' : 'ai.suggest.alsoFits'),
  );

  /** Tag chips not in the field yet; none once the field is full. */
  readonly tagChips = computed<AiChipView[]>(() => {
    this.formState.i18n();
    const tags = this.formState.model().tags;
    if (tags.length >= LINK_LIMIT.TagsMax) {
      return [];
    }
    const present = new Set(tags.map(tagKey));
    return this.suggestions().flatMap((item) => {
      const name = item.tagName;
      if (item.kind === SUGGESTION_KIND.Folder || name === null || present.has(tagKey(name))) {
        return [];
      }
      return [
        {
          id: item.id,
          kind: item.kind,
          label: name,
          ariaLabel: this.t(
            item.kind === SUGGESTION_KIND.NewTag ? 'ai.suggest.createTag' : 'ai.suggest.addTag',
            { name },
          ),
          dismissLabel: this.t('ai.suggest.dismiss', { name }),
          acceptedMessage: this.t('ai.suggest.tagAdded', { name }),
        },
      ];
    });
  });

  /** The one AI line of the dialog: the monthly limit, or "not available" (Try again once). */
  readonly line = computed<AiLineView | null>(() => {
    this.formState.i18n();
    if (!this.on() || this.editing) {
      return null;
    }
    const state = this.draft.state();
    if (state === AI_DRAFT_STATE.Quota) {
      const date = aiResetDate(this.settings.resetsOn() ?? '');
      return {
        text: this.t('ai.line.limit', {
          date: date === null ? '' : this.locale.formatDate(date),
          limit: this.locale.formatNumber(this.settings.usage()?.linksLimit ?? 0),
        }),
        actionLabel: this.t('ai.line.settings'),
      };
    }
    if (state === AI_DRAFT_STATE.Unavailable) {
      return {
        text: this.t('ai.line.unavailable'),
        actionLabel: this.draft.canRetry() ? this.t('ai.line.retry') : '',
      };
    }
    return null;
  });

  /** Edit link: the folder AI moved the link to, while the field still holds it. */
  readonly folderApplied = computed(() => {
    const folderId = this.linkState.autoApplied()?.folderId ?? null;
    return this.editing && folderId !== null && this.formState.model().folderId === folderId;
  });

  /** Edit link: how many of the tags AI added are still in the field. */
  readonly tagsApplied = computed(() => {
    const added = this.linkState.autoApplied()?.tags ?? [];
    const present = new Set(this.formState.model().tags.map(tagKey));
    return this.editing ? added.filter((tag) => present.has(tagKey(tag))).length : 0;
  });

  /** "2 added by AI" for the tags mark. */
  readonly tagsAppliedLabel = computed(() => {
    this.formState.i18n();
    const count = this.tagsApplied();
    return this.t(pluralKey('ai.applied.tags', count), { count });
  });

  constructor() {
    if (this.editing) {
      const link = this.formState.original;
      effect(() => {
        if (this.on() && link) {
          untracked(() => void this.linkState.load(link.id));
        }
      });
      return;
    }
    // Once the preview of an address is in: ask for the draft (the service ignores a repeat).
    effect(() => {
      const url = this.previewService.previewUrl();
      const ready = this.previewService.previewState() === PREVIEW_STATE.Ready;
      if (!this.on() || url === undefined) {
        untracked(() => this.draft.reset());
        return;
      }
      if (ready) {
        const preview = this.previewService.fetchedPreview();
        untracked(() =>
          this.draft.start({
            url,
            title: preview?.title,
            description: preview?.description ?? undefined,
            note: this.formState.model().note,
          }),
        );
      }
    });
  }

  /** A taken chip goes into its field. */
  accept(chip: AiChipView): void {
    if (chip.kind === SUGGESTION_KIND.Folder) {
      const item = this.suggestions().find((suggestion) => suggestion.id === chip.id);
      const field = this.formState.form.folderId();
      field.value.set(item?.folderId ?? field.value());
      field.markAsDirty();
      return;
    }
    this.addTags([chip.label]);
  }

  /** "Add all" of the tags row. */
  acceptAllTags(): void {
    this.addTags(this.tagChips().map((chip) => chip.label));
  }

  dismiss(chip: AiChipView): void {
    if (this.editing) {
      this.linkState.dismiss(chip.id);
    } else {
      this.draft.dismiss(chip.id);
    }
  }

  /** The line's button: "Try again", or "AI settings" (the dialog closes, unsaved). */
  lineAction(): void {
    if (this.draft.state() === AI_DRAFT_STATE.Unavailable) {
      this.draft.retry();
      return;
    }
    this.ref.close();
    void this.router.navigateByUrl(`/${APP_PATH.Settings}/${SETTINGS_PATH.Ai}`);
  }

  /** Undo of "Moved by AI" / "added by AI": the field and the feed show the link as it is then. */
  async undo(part: AiAppliedPart): Promise<void> {
    const link = this.formState.original;
    if (!link || this.undoing() !== null) {
      return;
    }
    const removed = new Set((this.linkState.autoApplied()?.tags ?? []).map(tagKey));
    this.undoing.set(part);
    const saved = await this.linkState.undo(link.id, part);
    this.undoing.set(null);
    if (!saved) {
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('ai.applied.undoFailed') });
      return;
    }
    this.formState.model.update((model) =>
      part === AI_APPLIED_PART.Folder
        ? { ...model, folderId: saved.folderId }
        : { ...model, tags: model.tags.filter((tag) => !removed.has(tagKey(tag))) },
    );
    this.injector.get(LinksStore).applyEdit(saved);
  }

  /** The `aiDraftId` of the create request; `null` when there is no draft. */
  draftId(): string | null {
    return this.on() && !this.editing ? this.draft.draftId() : null;
  }

  private addTags(names: readonly string[]): void {
    const field = this.formState.form.tags();
    const tags = field.value();
    const present = new Set(tags.map(tagKey));
    const added = names.map(normalizeTagName).filter((name) => {
      const fresh = name !== '' && !present.has(name.toLowerCase());
      present.add(name.toLowerCase());
      return fresh;
    });
    field.value.set([...tags, ...added].slice(0, LINK_LIMIT.TagsMax));
    field.markAsDirty();
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.formState.text(key, params);
  }
}
