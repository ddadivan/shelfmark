import { computed, effect, inject, Service, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LINK_LIMIT, type LinkDuplicate, type LinkPreview } from '@shelfmark/contracts';
import { switchMap, tap, timer } from 'rxjs';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { LINKS_API } from '../models/links-api.const';
import { PREVIEW_STATE } from '../models/preview-state.const';
import type { PreviewState } from '../models/preview-state.type';
import { displayHost, urlWithoutScheme } from '../utils/http-url';
import { AddLinkFormService } from './add-link-form.service';

/** Wait after the last keystroke before the preview is requested (a paste is instant to the eye). */
const PREVIEW_DEBOUNCE_MS = 350;

/**
 * Preview and duplicate check of the add-link dialog (provided by the dialog component). The
 * preview is an `rxResource` keyed by the valid URL, so a new URL cancels the old request (the
 * debounce is the `timer` inside the stream). Its result autofills the title until the user edits
 * it. A failed preview is not an error for saving. In edit mode the request serves the duplicate
 * check alone (the link itself is not a duplicate).
 */
@Service({ autoProvided: false })
export class AddLinkPreviewService {
  private readonly linksApi = inject(LINKS_API);
  private readonly formState = inject(AddLinkFormService);
  private readonly library = inject(UserSettingsStore).libraryShown;

  /** "Fetch titles and previews" is on: the preview loads the page (else it only checks duplicates). */
  readonly fetchPages = computed(() => this.library().fetchPreviews);

  /** The typed URL once it is a valid http(s) URL; the preview follows it. */
  readonly previewUrl = computed(() => {
    const url = this.formState.form.url();
    const value = url.value().trim();
    // The duplicate check always runs (#315), so a valid new address always asks the server; an
    // edit only checks a changed address for duplicates (the saved one needs no preview).
    return url.valid() && value !== this.formState.original?.url ? value : undefined;
  });

  private readonly preview = rxResource({
    params: () => this.previewUrl(),
    stream: ({ params: url }) =>
      timer(PREVIEW_DEBOUNCE_MS).pipe(
        switchMap(() => this.linksApi.preview(url)),
        tap({
          next: (response) => {
            // Not fetched: `preview.title` is only the URL; the server defaults the title itself.
            if (response.fetched) {
              this.autofillTitle(response.preview.title);
            }
          },
          error: () => {
            this.autofillTitle(urlWithoutScheme(url));
          },
        }),
      ),
  });

  readonly previewState = computed<PreviewState>(() => {
    if (this.previewUrl() === undefined) {
      return PREVIEW_STATE.Idle;
    }
    if (this.preview.error()) {
      return PREVIEW_STATE.Failed;
    }
    return this.preview.hasValue() ? PREVIEW_STATE.Ready : PREVIEW_STATE.Loading;
  });

  /** What the template shows: an edit has no preview card, only the duplicate notice. */
  readonly shownState = computed<PreviewState>(() => {
    const state = this.previewState();
    // Without page fetches the request is only the duplicate check: no skeleton, no failure.
    return (this.formState.editing || !this.fetchPages()) && state !== PREVIEW_STATE.Ready
      ? PREVIEW_STATE.Idle
      : state;
  });

  /** The page could not be fetched: the preview only echoes the URL (the duplicate still counts). */
  readonly noPreview = computed(
    () =>
      !this.formState.editing &&
      this.fetchPages() &&
      this.previewState() === PREVIEW_STATE.Ready &&
      this.preview.hasValue() &&
      !this.preview.value().fetched,
  );

  readonly previewData = computed(() => (!this.formState.editing ? this.fetchedPreview() : null));

  readonly previewHost = computed(() => displayHost(this.previewUrl() ?? ''));

  readonly duplicate = computed(() =>
    this.previewState() === PREVIEW_STATE.Ready && this.preview.hasValue()
      ? this.otherThanOriginal(this.preview.value().duplicate)
      : null,
  );

  constructor() {
    // The preview is gone (URL emptied or no longer valid): drop a title it filled in.
    // An `effect` because the field tree exposes `dirty()` but has no value-change hook, and the
    // form model is a plain signal, so a `linkedSignal` could not see whether the user typed.
    effect(() => {
      if (!this.formState.editing && this.previewUrl() === undefined) {
        untracked(() => {
          const title = this.formState.form.title();
          if (!title.dirty()) {
            title.value.set('');
          }
        });
      }
    });
  }

  /** The loaded preview of the current URL when the server could fetch the page. */
  fetchedPreview(): LinkPreview | null {
    return this.previewState() === PREVIEW_STATE.Ready &&
      this.preview.hasValue() &&
      this.preview.value().fetched
      ? this.preview.value().preview
      : null;
  }

  private otherThanOriginal(duplicate: LinkDuplicate | null): LinkDuplicate | null {
    return duplicate && duplicate.id !== this.formState.original?.id ? duplicate : null;
  }

  /** Fills the title from the preview, unless the user has typed in it. */
  private autofillTitle(title: string): void {
    const field = this.formState.form.title();
    if (!this.formState.editing && !field.dirty()) {
      field.value.set(title.slice(0, LINK_LIMIT.TitleMax));
    }
  }
}
