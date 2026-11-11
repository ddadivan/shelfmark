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
import { LANDING_PREVIEW_CARDS } from '../../models/landing-preview-cards.const';

/**
 * The app preview on the first screen (Landing.dc.html): a "Read later" folder with a view
 * switch, three link cards drawn like the library's and a "Saved to Read later" toast with Undo
 * overlapping its corner. Only as many cards as fit at a readable width are visible (the rest are clipped by the grid). Decorative and static (no real links); it plays once, quietly: the
 * cards land one after another, then the toast slides in. That starts when the preview is in
 * view in a visible tab (`LandingLoopGateDirective`); until then, and only where motion is
 * allowed, the parts wait invisibly. With reduced motion nothing waits and nothing plays: the
 * final frame is simply there.
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

  protected readonly cards = LANDING_PREVIEW_CARDS;

  protected readonly options = computed(() => [
    { value: 'all', label: this.label('landing.hero.preview.all') },
    { value: 'articles', label: this.label('landing.hero.preview.articles') },
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
  }

  /** `translate` is not reactive: reading the active language makes the label follow a switch. */
  private label(key: string): string {
    activeLang();
    return this.transloco.translate(key);
  }
}
