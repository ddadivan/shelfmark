import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ASK_ERROR_REASON, ASK_PERIOD } from '@shelfmark/contracts';
import {
  AiLineComponent,
  ButtonComponent,
  ReducedMotion,
  StreamingAnswerComponent,
  type StreamingCiteLabel,
} from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { aiResetDate } from '../../utils/ai-reset-date';
import type { AskEntry } from '../../models/ask-entry.interface';
import type { AskLine } from '../../models/ask-line.interface';
import { ASK_ENTRY_STATE } from '../../models/ask-entry-state.const';
import { AskSourcesComponent } from '../ask-sources/ask-sources.component';

/** How long a citation keeps its source row highlighted (StreamingAnswer spec). */
const HIGHLIGHT_MS = 1500;

/**
 * One question of the Ask panel: the streamed answer (`ui-streaming-answer`) with its sources, or
 * the "not in your links" actions, the limit line or the error line with "Try again" (only when
 * the question was not counted). A citation scrolls to its source row and highlights it for 1.5 s.
 */
@Component({
  selector: 'app-ask-entry',
  imports: [
    TranslocoPipe,
    AiLineComponent,
    ButtonComponent,
    StreamingAnswerComponent,
    AskSourcesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-entry.component.html',
  styleUrl: './ask-entry.component.scss',
})
export class AskEntryComponent {
  readonly entry = input.required<AskEntry>();
  /** "Try again" on a question that did not count. */
  readonly retry = output<void>();
  /** "Search “…”" for a question the links do not answer. */
  readonly searchRequested = output<string>();
  /** "Add a link" for a question the links do not answer. */
  readonly addRequested = output<void>();

  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);
  private readonly motion = inject(ReducedMotion);
  private readonly locale = inject(LocaleService);
  protected readonly ASK_ENTRY_STATE = ASK_ENTRY_STATE;

  protected readonly highlighted = signal<number | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly citeLabel: StreamingCiteLabel = (n) =>
    this.transloco.translate('ai.ask.source', { n });
  protected readonly idPrefix = computed(() => `ask-${this.entry().id}-source`);
  protected readonly streaming = computed(() => this.entry().state === ASK_ENTRY_STATE.Streaming);
  /**
   * Citations whose link is gone (trashed meanwhile): rendered disabled. Only known once `done`
   * arrived; after Stop or a broken stream every citation stays enabled.
   */
  protected readonly disabledCites = computed(() => {
    const entry = this.entry();
    if (entry.state !== ASK_ENTRY_STATE.Done || !entry.sourcesKnown) {
      return [];
    }
    const known = new Set(entry.sources.map((source) => source.n));
    return entry.segments.flatMap((segment) =>
      'cite' in segment && !known.has(segment.cite) ? [segment.cite] : [],
    );
  });
  /** The answer block shows: streaming, or a done answer with text. */
  protected readonly answered = computed(() => {
    const entry = this.entry();
    return entry.state === ASK_ENTRY_STATE.Streaming || entry.segments.length > 0;
  });
  /** The line in place of an answer: the limit, an error, or "not found" / "stopped" without text. */
  protected readonly line = computed((): AskLine | null => {
    const entry = this.entry();
    switch (entry.state) {
      case ASK_ENTRY_STATE.Limit:
        return {
          key:
            entry.allowance?.period === ASK_PERIOD.Day ? 'ai.ask.limit.day' : 'ai.ask.limit.month',
          params: { date: this.resetDate(entry.allowance?.resetsOn ?? '') },
        };
      case ASK_ENTRY_STATE.Error:
        return {
          key:
            entry.reason === ASK_ERROR_REASON.Busy
              ? 'ai.ask.busy'
              : entry.reason === ASK_ERROR_REASON.Rejected
                ? 'ai.ask.rejected'
                : entry.reason === ASK_ERROR_REASON.Off
                  ? 'ai.ask.off'
                  : 'ai.ask.error',
          params: {},
        };
      default:
        return null;
    }
  });
  /** "Try again" is offered for an error that did not count (every error event; not `off`). */
  protected readonly canRetry = computed(
    () =>
      this.entry().state === ASK_ENTRY_STATE.Error && this.entry().reason !== ASK_ERROR_REASON.Off,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  private resetDate(iso: string): string {
    const date = aiResetDate(iso);
    return date === null ? '' : this.locale.formatDate(date);
  }

  protected cite(n: number): void {
    const row = this.doc.getElementById(`${this.idPrefix()}-${n}`);
    row?.scrollIntoView({ block: 'nearest', behavior: this.motion.reduced() ? 'auto' : 'smooth' });
    this.highlighted.set(n);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.highlighted.set(null), HIGHLIGHT_MS);
  }
}
