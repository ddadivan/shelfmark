import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SegmentedControlComponent, ToastComponent, TOAST_KIND } from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LinkPreviewCardComponent } from '../../../links/link-preview-card/link-preview-card.component';
import { LandingLoopGateDirective } from '../../directives/landing-loop-gate.directive';
import { LandingMotionService } from '../../landing-motion.service';
import { LANDING_LOOP } from '../../models/landing-loop.const';
import { LANDING_PREVIEW_CARDS } from '../../models/landing-preview-cards.const';
import { LANDING_PREVIEW_FILTER } from '../../models/landing-preview-filter.const';
import type { LandingPreviewFilter } from '../../models/landing-preview-filter.type';

/** Cards the intro staggers before the toast: the three of a full row (the fourth waits off it). */
const INTRO_SLOTS = 3;

/**
 * The app preview on the first screen (Landing.dc.html): a "Read later" folder with a view
 * switch, link cards drawn like the library's and a "Saved to Read later" toast with Undo
 * overlapping its corner. Only as many cards as fit at a readable width are visible. Decorative
 * and static (no real links). When the preview is first in view in a visible tab
 * (`LandingLoopGateDirective`) the cards land one after another and the toast slides in, once.
 * Then the switch plays a loop: its thumb slides from "All" to "Articles", the video leaves, the
 * articles glide one slot over and the next article comes in; after a pause it goes back. The
 * loop runs only while the gate is open (in view, tab visible, motion allowed) and pauses where it
 * is otherwise. Every card sits in one grid cell and is moved to its slot by `translate`, so
 * nothing is laid out again and only `transform` / `opacity` change. With reduced motion nothing
 * waits and nothing plays: the "All" frame is simply there.
 */
@Component({
  selector: 'app-landing-hero-preview',
  imports: [TranslocoPipe, SegmentedControlComponent, ToastComponent, LinkPreviewCardComponent],
  hostDirectives: [LandingLoopGateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-hero-preview.component.html',
  styleUrl: './landing-hero-preview.component.scss',
})
export class LandingHeroPreviewComponent {
  protected readonly TOAST_KIND = TOAST_KIND;
  protected readonly INTRO_SLOTS = INTRO_SLOTS;

  private readonly motion = inject(LandingMotionService);
  private readonly transloco = inject(TranslocoService);
  private readonly gate = inject(LandingLoopGateDirective);

  /** Can the parts be hidden until the preview is seen: after the first render, with a viewport observer. */
  private readonly armed = signal(false);
  /** The preview was seen once: the landing animation runs and is never repeated. */
  protected readonly playing = signal(false);
  /** Hidden, waiting to be seen. Never under reduced motion, whatever else happens. */
  protected readonly waiting = computed(
    () => this.armed() && !this.playing() && !this.motion.reducedMotion(),
  );

  /** Where the loop is; what is shown is always "All" under reduced motion. */
  private readonly filter = signal<LandingPreviewFilter>(LANDING_PREVIEW_FILTER.All);
  protected readonly shown = computed<LandingPreviewFilter>(() =>
    this.motion.reducedMotion() ? LANDING_PREVIEW_FILTER.All : this.filter(),
  );
  protected readonly articles = computed(() => this.shown() === LANDING_PREVIEW_FILTER.Articles);

  /**
   * Each card with its slot in the row: "All" counts from the first card, "Articles" from the
   * first article, so a card that is not an article goes to slot -1 (it leaves) and every article
   * moves one slot over. Slots past the row's last column are off it (transparent).
   */
  protected readonly cards = computed(() => {
    const firstArticle = LANDING_PREVIEW_CARDS.findIndex((card) => card.article);
    const offset = this.articles() ? firstArticle : 0;
    return LANDING_PREVIEW_CARDS.map((card, index) => ({
      card,
      index,
      slot: !card.article && this.articles() ? -1 : index - offset,
    }));
  });

  protected readonly options = computed(() => [
    { value: LANDING_PREVIEW_FILTER.All, label: this.label('landing.hero.preview.all') },
    { value: LANDING_PREVIEW_FILTER.Articles, label: this.label('landing.hero.preview.articles') },
  ]);

  protected readonly folder = computed(() => this.label('landing.hero.preview.folder'));

  constructor() {
    afterNextRender(() => {
      if (typeof IntersectionObserver !== 'undefined') {
        this.armed.set(true);
      }
    });
    effect(() => {
      if (this.gate.active()) {
        this.playing.set(true);
      }
    });
    // The switch loop: one timer at a time, only while the gate is open; a closed gate (out of
    // view, hidden tab, reduced motion) clears it and the loop waits where it is.
    effect((onCleanup) => {
      if (!this.playing() || !this.gate.active()) {
        return;
      }
      const all = this.filter() === LANDING_PREVIEW_FILTER.All;
      const timer = setTimeout(
        () => this.filter.set(all ? LANDING_PREVIEW_FILTER.Articles : LANDING_PREVIEW_FILTER.All),
        all ? LANDING_LOOP.PreviewAllHoldMs : LANDING_LOOP.PreviewArticlesHoldMs,
      );
      onCleanup(() => clearTimeout(timer));
    });
  }

  /** `translate` is not reactive: reading the active language makes the label follow a switch. */
  private label(key: string): string {
    activeLang();
    return this.transloco.translate(key);
  }
}
