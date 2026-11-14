import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  LINK_LIMIT,
  type CreateLinksBatchItem,
  type CreateLinksBatchRequest,
  type LinkPreviewResponse,
} from '@shelfmark/contracts';
import {
  BADGE_TONE,
  BadgeComponent,
  BUTTON_SIZE,
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  CheckboxComponent,
  DialogComponent,
  injectDialogData,
  NOTICE_KIND,
  NoticeComponent,
  SelectComponent,
  TagInputComponent,
  UiDialogRef,
  type TagSuggestion,
} from '@shelfmark/ui';
import { firstValueFrom, switchMap } from 'rxjs';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { FoldersStore } from '../../../../stores/folders.store';
import { TagsStore } from '../../../../stores/tags.store';
import { normalizeTagNames } from '../../../tags/utils/normalize-tag-names';
import { buildFolderOptions } from '../../utils/folder-options';
import { displayHost, urlWithoutScheme } from '../../utils/http-url';
import { ADD_LINK_ACTION } from '../../models/add-link-action.const';
import type { AddLinkDialogData } from '../../models/add-link-dialog-data.interface';
import type { AddLinkResult } from '../../models/add-link-result.type';
import type { AddLinkSavedMany } from '../../models/add-link-saved-many.interface';
import { LINKS_API } from '../../models/links-api.const';
import { batchSaveError } from './batch-save-error';
import { fitTitle } from './fit-title';
import { loadPreviews } from './load-previews';
import type { BatchSaveError } from './models/batch-save-error.interface';
import type { ParsedPaste } from './models/parsed-paste.interface';
import type { PasteManyFormModel } from './models/paste-many-form-model.interface';
import type { PasteRow } from './models/paste-row.interface';

/**
 * The add-link dialog after a paste with several links (screen `PasteMany`): one row per link,
 * selected by default, with its preview loaded in the background (a few at a time through the
 * preview endpoint); links that are already saved come unchecked with an "Already saved" badge.
 * Rows can be unchecked or removed; "Folder for all" and "Tags for all" apply to every link. Lines
 * without a link are listed as skipped, links past `LINK_LIMIT.BatchMax` are counted in a note.
 * "Save N links" sends one `POST /api/links/batch` with one idempotency key per link for the whole
 * dialog session, so a retry or a double click never saves a link twice.
 *
 * Rendered by `AddLinkDialogComponent` in place of its form; it closes the same dialog with an
 * `AddLinkSavedMany` result.
 */
@Component({
  selector: 'app-paste-many-list',
  imports: [
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    FormField,
    FormRoot,
    NoticeComponent,
    SelectComponent,
    TagInputComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paste-many-list.component.html',
  styleUrl: './paste-many-list.component.scss',
})
export class PasteManyListComponent {
  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly LINK_LIMIT = LINK_LIMIT;
  protected readonly pluralKey = pluralKey;

  /** What the paste held; read once (a new paste builds a new list). */
  readonly paste = input.required<ParsedPaste>();
  /** The folder chosen in the dialog so far (the open folder by default); `null` = "Unsorted". */
  readonly folderId = input<string | null>(null);
  /** Tags entered in the dialog so far. */
  readonly tags = input<readonly string[]>([]);

  /** The phone sheet has a close button and no Cancel, like the single-link dialog. */
  protected readonly phone = inject(ViewportService).phone;
  private readonly linksApi = inject(LINKS_API);
  private readonly folders = inject(FoldersStore);
  private readonly tagStore = inject(TagsStore);
  private readonly ref = inject<UiDialogRef<AddLinkResult>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  private readonly injector = inject(Injector);
  private readonly data = injectDialogData<AddLinkDialogData>();
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  private readonly allBox = viewChild.required<CheckboxComponent>('all');
  private readonly rowBoxes = viewChildren<CheckboxComponent>('rowBox');

  /** The links of the paste, minus the removed ones; each keeps its key for the whole dialog. */
  protected readonly rows = linkedSignal<readonly PasteRow[]>(() =>
    this.paste().links.map((url) => ({ url, key: globalThis.crypto.randomUUID() })),
  );
  /** Loaded previews by URL; `null` when the preview failed. Missing: still loading (or never). */
  private readonly previews = signal<ReadonlyMap<string, LinkPreviewResponse | null>>(new Map());
  /** The preview endpoint answered 429: the rows without a preview keep their address. */
  private readonly previewsStopped = signal(false);
  /** Check boxes the user changed; the others follow the default (checked unless already saved). */
  private readonly choices = signal<ReadonlyMap<string, boolean>>(new Map());

  private readonly model = linkedSignal<PasteManyFormModel>(() => ({
    folderId: this.folderId(),
    tags: [...normalizeTagNames(this.tags())],
  }));
  protected readonly form = form(this.model, () => undefined, {
    submission: { action: () => this.save() },
  });

  protected readonly saving = signal(false);
  protected readonly saveError = signal<BatchSaveError | null>(null);

  protected readonly folderOptions = computed(() => buildFolderOptions(this.folders.entities()));
  protected readonly tagSuggestions = computed<TagSuggestion[]>(() => {
    this.i18n();
    return this.tagStore.entities().map((tag) => ({
      name: tag.name,
      countLabel: this.transloco.translate(pluralKey('tags.count', tag.linkCount), {
        count: tag.linkCount,
      }),
    }));
  });

  /** What each row shows. */
  protected readonly views = computed(() => {
    this.i18n();
    const previews = this.previews();
    const stopped = this.previewsStopped();
    const choices = this.choices();
    return this.rows().map((row) => {
      const response = previews.get(row.url);
      const loading = response === undefined && !stopped;
      const duplicate = response?.duplicate ?? null;
      const title =
        response?.fetched && response.preview.title.trim() !== ''
          ? response.preview.title
          : urlWithoutScheme(row.url);
      return {
        row,
        title,
        meta: loading ? this.transloco.translate('links.many.row.loading') : displayHost(row.url),
        duplicate: duplicate !== null,
        checked: choices.get(row.url) ?? duplicate === null,
      };
    });
  });

  protected readonly selected = computed(() =>
    this.views()
      .filter((view) => view.checked)
      .map((view) => view.row),
  );
  protected readonly selectedCount = computed(() => this.selected().length);
  protected readonly allChecked = computed(
    () => this.rows().length > 0 && this.selectedCount() === this.rows().length,
  );
  protected readonly someChecked = computed(
    () => this.selectedCount() > 0 && this.selectedCount() < this.rows().length,
  );
  protected readonly duplicateCount = computed(
    () => this.views().filter((view) => view.duplicate).length,
  );

  constructor() {
    void this.folders.load();
    void this.tagStore.load();
    toObservable(this.paste)
      .pipe(
        switchMap((paste) => loadPreviews(paste.links, (url) => this.linksApi.preview(url))),
        takeUntilDestroyed(),
      )
      .subscribe(({ url, response, stopped }) => {
        this.previews.update((map) => new Map(map).set(url, response));
        if (stopped) {
          this.previewsStopped.set(true);
        }
      });
    // Tags leave the field the way the API stores them, as in the single-link form.
    effect(() => {
      const field = this.form.tags();
      const tags = field.value();
      const normalized = normalizeTagNames(tags);
      if (normalized !== tags) {
        untracked(() => field.value.set([...normalized]));
      }
    });
    // The list replaced the address field, which had focus: focus moves to "Select all".
    afterNextRender(() => {
      this.allBox().focus();
    });
  }

  protected toggle(row: PasteRow, checked: boolean): void {
    this.choices.update((map) => new Map(map).set(row.url, checked));
  }

  protected toggleAll(checked: boolean): void {
    this.choices.set(new Map(this.rows().map((row) => [row.url, checked])));
  }

  /** Takes a row out of the list; focus moves to the next row (or "Select all" when none is left). */
  protected remove(row: PasteRow): void {
    const index = this.rows().indexOf(row);
    this.rows.update((rows) => rows.filter((item) => item !== row));
    afterNextRender(
      () => {
        const boxes = this.rowBoxes();
        const next = boxes[Math.min(index, boxes.length - 1)];
        (next ?? this.allBox()).focus();
      },
      { injector: this.injector },
    );
  }

  protected cancel(): void {
    this.ref.close();
  }

  private async save(): Promise<undefined> {
    const rows = this.selected();
    if (this.saving() || rows.length === 0) {
      return;
    }
    const { folderId, tags } = this.model();
    const names = [...normalizeTagNames(tags)];
    const request: CreateLinksBatchRequest = {
      items: rows.map((row) => this.item(row)),
      ...(folderId !== null && { folderId }),
      ...(names.length > 0 && { tags: names }),
    };
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const pending = firstValueFrom(this.linksApi.createBatch(request)).then(
        (response): AddLinkSavedMany => ({
          action: ADD_LINK_ACTION.SavedMany,
          links: response.links,
          errors: response.errors,
          folderId,
        }),
      );
      // The caller still gets the links when the dialog is dismissed while the request runs.
      this.data.session.saving = pending.catch(() => undefined);
      const saved = await pending;
      // `saving` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(saved);
    } catch (error) {
      this.saving.set(false);
      this.saveError.set(batchSaveError(error));
    }
    return undefined;
  }

  /** One batch item: the URL and its key, plus the title and image hints of a loaded preview. */
  private item(row: PasteRow): CreateLinksBatchItem {
    const response = this.previews().get(row.url);
    const preview = response?.fetched ? response.preview : null;
    const title = preview ? fitTitle(preview.title) : '';
    return {
      url: row.url,
      idempotencyKey: row.key,
      ...(title !== '' && { title }),
      ...(preview?.faviconUrl && { faviconUrl: preview.faviconUrl }),
      ...(preview?.imageUrl && { imageUrl: preview.imageUrl }),
    };
  }
}
