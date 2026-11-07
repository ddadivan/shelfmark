import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { LandingMotionService } from './landing-motion.service';
import { LandingBeforeAfterComponent } from './components/landing-before-after/landing-before-after.component';
import { LandingBuiltComponent } from './components/landing-built/landing-built.component';
import { LandingFinaleComponent } from './components/landing-finale/landing-finale.component';
import { LandingFooterComponent } from './components/landing-footer/landing-footer.component';
import { LandingHeaderComponent } from './components/landing-header/landing-header.component';
import { LandingHeroComponent } from './components/landing-hero/landing-hero.component';
import { LandingWhyComponent } from './components/landing-why/landing-why.component';

/** Public landing page for guests: one presentational component per section. */
@Component({
  selector: 'app-landing-page',
  imports: [
    LandingHeaderComponent,
    LandingHeroComponent,
    LandingBeforeAfterComponent,
    LandingWhyComponent,
    LandingBuiltComponent,
    LandingFinaleComponent,
    LandingFooterComponent,
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
  private readonly scrollPending = signal(false);
  private readonly built = viewChild(LandingBuiltComponent, { read: ElementRef });

  constructor() {
    effect(() => {
      const built = this.built();
      if (built && this.scrollPending()) {
        this.scrollPending.set(false);
        const target = (built.nativeElement as HTMLElement).querySelector<HTMLElement>('#how');
        target?.scrollIntoView();
        target?.focus({ preventScroll: true });
      }
    });
  }

  protected showHowItsBuilt(): void {
    this.scrollPending.set(true);
    this.sectionsRequested.set(true);
  }
}
