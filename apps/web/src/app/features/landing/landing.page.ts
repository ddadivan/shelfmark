import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LandingMotionService } from './services/landing-motion.service';
import { LANDING_SCROLL_TARGET } from './models/landing-scroll-target.const';
import type { LandingScrollTarget } from './models/landing-scroll-target.type';
import { LandingAiComponent } from './components/landing-ai/landing-ai.component';
import { LandingBentoComponent } from './components/landing-bento/landing-bento.component';
import { LandingBeforeAfterComponent } from './components/landing-before-after/landing-before-after.component';
import { LandingBuiltComponent } from './components/landing-built/landing-built.component';
import { LandingExtensionComponent } from './components/landing-extension/landing-extension.component';
import { LandingFinaleComponent } from './components/landing-finale/landing-finale.component';
import { LandingFooterComponent } from './components/landing-footer/landing-footer.component';
import { LandingWhatsNewComponent } from './components/landing-whats-new/landing-whats-new.component';
import { LandingRevealDirective } from './directives/landing-reveal.directive';
import { injectSignedIn } from './utils/inject-signed-in';
import { LandingHeaderComponent } from './components/landing-header/landing-header.component';
import { LandingHeroComponent } from './components/landing-hero/landing-hero.component';
import { LandingWhyComponent } from './components/landing-why/landing-why.component';

const TARGETS: readonly string[] = Object.values(LANDING_SCROLL_TARGET);

/** The public landing (Shelf 16-landing) for `/` and `/about`: one component per section. */
@Component({
  selector: 'app-landing-page',
  imports: [
    LandingHeaderComponent,
    LandingHeroComponent,
    LandingBentoComponent,
    LandingAiComponent,
    LandingBeforeAfterComponent,
    LandingWhyComponent,
    LandingBuiltComponent,
    LandingExtensionComponent,
    LandingFinaleComponent,
    LandingFooterComponent,
    LandingRevealDirective,
    LandingWhatsNewComponent,
  ],
  // Per page, so the motion listeners are removed when the visitor leaves the landing page.
  providers: [LandingMotionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss',
})
export default class LandingPage {
  /** Set when the visitor jumps to a deferred section before the browser went idle. */
  protected readonly sectionsRequested = signal(false);
  /** `/about` for a signed-in person: "What's new" shows under the hero. */
  protected readonly signedIn = injectSignedIn();
  private readonly scrollPending = signal<LandingScrollTarget | null>(null);
  private readonly document = inject(DOCUMENT);
  private readonly motion = inject(LandingMotionService);
  private readonly built = viewChild('built', { read: ElementRef });
  /** A section above "How it's built": the scroll waits for it, or the page would jump. */
  private readonly beforeAfter = viewChild('beforeAfter', { read: ElementRef });
  /** The bento closes the first deferred block (AI, extension, bento): its targets wait for it. */
  private readonly bento = viewChild('bento', { read: ElementRef });

  constructor() {
    // Opened as `/#how`, `/#works` or `/#ai` (new tab, shared link): load the sections and scroll.
    const hash = this.document.defaultView?.location.hash.slice(1) ?? '';
    if (TARGETS.includes(hash)) {
      this.showSection(hash as LandingScrollTarget);
    }
    effect(() => {
      const wanted = this.scrollPending();
      const target = wanted && this.ready(wanted) ? this.document.getElementById(wanted) : null;
      if (!wanted || !target) {
        return;
      }
      this.scrollPending.set(null);
      // Guarded: not every environment implements it (jsdom does not).
      if (typeof target.scrollIntoView === 'function') {
        // Smooth unless the visitor asked for reduced motion (read untracked: not a trigger).
        const reduced = untracked(() => this.motion.reducedMotion());
        // The web font swaps in after the sections: the text wraps differently and the page
        // grows, so a smooth scroll that started before would end short of the target.
        const fonts = this.document.fonts as FontFaceSet | undefined;
        void (fonts?.ready ?? Promise.resolve()).then(() =>
          target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }),
        );
      }
      target.focus({ preventScroll: true });
    });
  }

  protected showSection(target: LandingScrollTarget): void {
    this.scrollPending.set(target);
    this.sectionsRequested.set(true);
  }

  /**
   * Whether everything above a target is in the DOM (a section above it that arrives later would
   * push the page after the scroll): the first deferred block for AI and "How it works"; for
   * "How it's built" also the before / after board that sits between.
   */
  private ready(target: LandingScrollTarget): boolean {
    const first = this.bento() !== undefined;
    if (target !== LANDING_SCROLL_TARGET.HowItsBuilt) {
      return first;
    }
    return first && this.beforeAfter() !== undefined && this.built() !== undefined;
  }
}
