import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { LINK_KIND, READER_LIMIT, type ReaderArticle } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../core/i18n/locale.service';
import { READER_API } from '../../reader/models/reader-api.const';
import { READER_SAMPLE } from '../../reader/models/reader-sample.const';
import type { ReaderSettings } from '../../reader/models/reader-settings.interface';
import { ReaderSettingsService } from '../../reader/services/reader-settings.service';
import { progressToSave } from '../../reader/utils/progress-to-save';
import { readerMeta } from '../../reader/utils/reader-meta';
import { PREVIEW_BODY_KIND } from '../models/preview-body-kind.const';
import { PREVIEW_MODE } from '../models/preview-mode.const';
import type { PreviewMode } from '../models/preview-mode.type';
import { LinkPreviewService } from './link-preview.service';

/**
 * Site and Reader on the Link page (Shelf, flows-and-structure 5.7; page-scoped next to
 * `LinkPreviewService`). Reader is offered for every link: an article shows as clean text, a page
 * without one (a shop, a video) shows the link's own picture, summary and note. The mode is kept
 * per site while the page lives (D14: the last one used there; first time Site). Also the details
 * panel toggle, the reading settings and the stored reading progress.
 */
@Service({ autoProvided: false })
export class PreviewReaderService {
  private readonly preview = inject(LinkPreviewService);
  private readonly api = inject(READER_API);
  private readonly sample = inject(READER_SAMPLE);
  private readonly readerSettings = inject(ReaderSettingsService);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  private readonly modes = signal<Readonly<Record<string, PreviewMode>>>({});
  /** The last share stored per link (fewer writes while scrolling). */
  private readonly saved = new Map<string, number>();

  readonly mode = computed<PreviewMode>(
    () => this.modes()[this.preview.host()] ?? PREVIEW_MODE.Site,
  );
  readonly reading = computed(
    () => this.mode() === PREVIEW_MODE.Reader && this.preview.link() !== null,
  );
  readonly settings = this.readerSettings.settings;
  /** The details panel beside (desktop) or under (phone) the page; hidden until asked (D13). */
  readonly detailsOpen = signal(false);

  private readonly articleResource = rxResource({
    params: () => (this.reading() ? (this.preview.currentId() ?? undefined) : undefined),
    stream: ({ params: id }) => this.api.article(id),
  });

  readonly loading = computed(() => this.articleResource.isLoading());
  /** The article, or `null` (none, not loaded yet, or the request failed). */
  readonly article = computed<ReaderArticle | null>(() =>
    this.articleResource.hasValue() ? (this.articleResource.value()?.article ?? null) : null,
  );
  /** Loaded and without text: the picture, description and note instead. */
  readonly empty = computed(() => this.reading() && !this.loading() && this.article() === null);

  readonly meta = computed(() => {
    const article = this.article();
    // Re-read on a language switch (`translate` is not reactive).
    this.locale.lang();
    if (!article) {
      return '';
    }
    return readerMeta([
      article.author,
      article.publishedAt ? this.locale.formatDate(article.publishedAt) : null,
      this.transloco.translate('preview.reader.minutes', { count: String(article.minutes) }),
    ]);
  });

  /** The muted line above the text: why Reader shows what it shows. */
  readonly notice = computed(() => {
    this.locale.lang();
    const link = this.preview.link();
    if (!link || !this.reading() || this.loading()) {
      return '';
    }
    if (this.article() === null) {
      return this.transloco.translate(
        link.kind === LINK_KIND.Video ? 'preview.reader.noTextVideo' : 'preview.reader.noText',
      );
    }
    if (this.sample) {
      // MOCK (Shelf): the dev API serves canned articles; say so.
      return this.transloco.translate('preview.reader.sampleNote');
    }
    return this.preview.body() === PREVIEW_BODY_KIND.Blocked
      ? this.transloco.translate('preview.reader.blockedNotice', { domain: this.preview.host() })
      : '';
  });

  setMode(mode: PreviewMode): void {
    const host = this.preview.host();
    this.modes.update((all) => ({ ...all, [host]: mode }));
  }

  toggleDetails(): void {
    this.detailsOpen.update((open) => !open);
  }

  setSettings(change: Partial<ReaderSettings>): void {
    this.readerSettings.set(change);
  }

  /** A Reader scroll: keeps how far the article was read (Revisit's "Continue reading"). */
  async onProgress(share: number): Promise<void> {
    const link = this.preview.link();
    const article = this.article();
    if (!link || !article || !progressToSave(share, this.saved.get(link.id) ?? null)) {
      return;
    }
    this.saved.set(link.id, share);
    try {
      await firstValueFrom(
        this.api.saveProgress(link.id, {
          fraction: Math.min(1, Math.max(0, Math.round(share * 100) / 100)),
          minutesLeft: Math.min(
            READER_LIMIT.MinutesLeftMax,
            Math.max(0, Math.ceil(article.minutes * (1 - share))),
          ),
        }),
      );
    } catch {
      // Progress is a convenience: a failed write is retried by the next scroll step.
      this.saved.delete(link.id);
    }
  }
}
