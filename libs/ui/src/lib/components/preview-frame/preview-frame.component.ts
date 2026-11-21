import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Renderer2,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { PROGRESS_BAR_VARIANT } from '../progress-bar/models/progress-bar-variant.const';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';
import { framableUrl } from './framable-url';
import { PREVIEW_FRAME_DEFAULT_TIMEOUT_MS } from './models/preview-frame-default-timeout.const';
import { PREVIEW_FRAME_PHASE } from './models/preview-frame-phase.const';
import type { PreviewFramePhase } from './models/preview-frame-phase.type';

/** What the iframe shows while it has no accepted page. */
const BLANK = 'about:blank';

/**
 * Shows a third-party page in a sandboxed `iframe` with the progress bar on top while it loads.
 *
 * Security (ADR 0059): this component is the single, vetted place where a URL reaches an
 * `iframe` `src`. Angular treats an iframe `src` as a resource URL and `bypassSecurityTrust*` is
 * banned, so the template has no `src` binding; instead `src` is validated by `framableUrl`
 * (absolute `https:`, no credentials, not the app's own origin) and only then written with
 * `Renderer2.setAttribute`. A refused `src` never touches the iframe: the frame is hidden,
 * stays blank and `rejected` emits. The iframe is sandboxed (`allow-scripts allow-same-origin
 * allow-popups allow-forms`: the page needs scripts and its own storage; no top navigation, no
 * downloads, no modals), sends no referrer and gets only the features a video player needs.
 *
 * `title` is the accessible name of the iframe. Because a `title` attribute on the host would
 * add a native tooltip over the whole frame, the host attribute is removed.
 *
 * Outputs: `loaded` (the page fired `load`), `timedOut` (no `load` within `timeoutMs`; the page
 * may still arrive and then `loaded` emits too), `rejected` (`src` refused; emitted instead of
 * `timedOut`, at once). A new `src` restarts progress and the timeout. The page keeps its own
 * look (white `--frame-canvas`) in both themes.
 */
@Component({
  selector: 'ui-preview-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressBarComponent],
  host: { '[attr.title]': 'null' },
  templateUrl: './preview-frame.component.html',
  styleUrl: './preview-frame.component.scss',
})
export class PreviewFrameComponent {
  protected readonly PROGRESS_BAR_VARIANT = PROGRESS_BAR_VARIANT;
  protected readonly PREVIEW_FRAME_PHASE = PREVIEW_FRAME_PHASE;

  /** The page to show; only an absolute `https:` URL without credentials is accepted. */
  readonly src = input.required<string>();
  /** Accessible name of the iframe. */
  readonly title = input.required<string>();
  /** Milliseconds without `load` before `timedOut` emits; 0 or less turns the timeout off. */
  readonly timeoutMs = input(PREVIEW_FRAME_DEFAULT_TIMEOUT_MS, { transform: numberAttribute });

  /** The page fired `load`. */
  readonly loaded = output<void>();
  /** No `load` within `timeoutMs`. */
  readonly timedOut = output<void>();
  /** `src` is not an accepted URL; the iframe was not given it. */
  readonly rejected = output<void>();

  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');
  private readonly renderer = inject(Renderer2);
  private readonly ownOrigin = inject(DOCUMENT).location?.origin;

  /** The `load` of an empty iframe (`about:blank`) is not the page's. */
  private armed = false;
  private showing = false;

  protected readonly phase = signal<PreviewFramePhase>(PREVIEW_FRAME_PHASE.Loading);
  protected readonly loading = computed(() => this.phase() === PREVIEW_FRAME_PHASE.Loading);

  constructor() {
    effect((onCleanup) => {
      const url = framableUrl(this.src(), this.ownOrigin);
      const timeout = this.timeoutMs();
      const iframe = untracked(this.frame).nativeElement;

      if (url === null) {
        this.armed = false;
        if (this.showing) {
          this.renderer.setAttribute(iframe, 'src', BLANK);
          this.showing = false;
        }
        this.phase.set(PREVIEW_FRAME_PHASE.Rejected);
        this.rejected.emit();
        return;
      }

      this.phase.set(PREVIEW_FRAME_PHASE.Loading);
      this.armed = true;
      this.showing = true;
      // The one place a URL reaches the iframe: `url` is the output of `framableUrl` above.
      this.renderer.setAttribute(iframe, 'src', url);

      if (timeout > 0) {
        const timer = setTimeout(() => {
          if (this.phase() === PREVIEW_FRAME_PHASE.Loading) {
            this.phase.set(PREVIEW_FRAME_PHASE.TimedOut);
            this.timedOut.emit();
          }
        }, timeout);
        onCleanup(() => clearTimeout(timer));
      }
    });
  }

  protected onLoad(): void {
    if (!this.armed || this.phase() === PREVIEW_FRAME_PHASE.Loaded) {
      return;
    }
    this.phase.set(PREVIEW_FRAME_PHASE.Loaded);
    this.loaded.emit();
  }
}
