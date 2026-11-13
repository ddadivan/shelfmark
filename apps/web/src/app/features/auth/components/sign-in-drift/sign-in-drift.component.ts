import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ReducedMotion } from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { LinkPreviewCardComponent } from '../../../links/components/link-preview-card/link-preview-card.component';
import { layoutDriftLane } from './drift-layout';
import { SIGN_IN_DRIFT_CARDS } from './models/sign-in-drift-cards.const';
import { SIGN_IN_DRIFT_FRAMES } from './models/sign-in-drift-frames.const';
import type { SignInDriftItem } from './models/sign-in-drift-item.interface';
import type { SignInDriftLane } from './models/sign-in-drift-lane.interface';
import { SIGN_IN_DRIFT_SIDE } from './models/sign-in-drift-side.const';
import { SIGN_IN_DRIFT_TIER } from './models/sign-in-drift-tier.const';
import type { SignInDriftTier } from './models/sign-in-drift-tier.type';
import { tiltVector } from './tilt-vector';

/** Tilt only where a precise hovering pointer exists, and never for people who want less motion. */
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/** One loop of the landing rings (`sd-ring` in the styles) and when the first one pulses, in seconds. */
const RING_LOOP_S = 24;
const RING_START_S = 2.6;

/** A layout draws the cards of its own tier and of every smaller one. */
const TIER_RANK: Record<SignInDriftTier, number> = {
  [SIGN_IN_DRIFT_TIER.Narrow]: 0,
  [SIGN_IN_DRIFT_TIER.Wide]: 1,
  [SIGN_IN_DRIFT_TIER.Huge]: 2,
};

/** The cards of each side with their seeded spots, for the narrow, wide and huge layout (computed once). */
function laneLayout(tier: SignInDriftTier): SignInDriftLane[] {
  const frame = SIGN_IN_DRIFT_FRAMES[tier];
  const lanes = Object.values(SIGN_IN_DRIFT_SIDE).map((side, sideIndex) => {
    const cards = SIGN_IN_DRIFT_CARDS.filter(
      (card) => card.side === side && TIER_RANK[card.tier] <= TIER_RANK[tier],
    );
    const places = layoutDriftLane(
      cards.map((card) => card.layer),
      frame,
      frame.seeds[sideIndex],
    );
    return { side, cards, places };
  });
  // The rings take turns across both sides, one side then the other.
  const total = lanes.reduce((sum, lane) => sum + lane.cards.length, 0);
  const step = RING_LOOP_S / total;
  return lanes.map(({ side, cards, places }, sideIndex) => ({
    side,
    frame,
    cards: cards.map((card, i) => ({
      card,
      place: places[i],
      ringDelay: Math.round(((i * lanes.length + sideIndex) * step + RING_START_S) * 100) / 100,
      tags: card.tags,
    })),
  }));
}

const LAYOUTS = new Map<SignInDriftTier, SignInDriftLane[]>();

function cachedLayout(tier: SignInDriftTier): SignInDriftLane[] {
  let layout = LAYOUTS.get(tier);
  if (!layout) {
    layout = laneLayout(tier);
    LAYOUTS.set(tier, layout);
  }
  return layout;
}

/**
 * Saved-link cards that drift around the glass sign-in card on a desktop
 * (docs/design/screens/SignIn.dc.html): fourteen on a wide screen (#315), twenty-two on a 4K / 5K one (from 160em,
 * `ViewportService.huge`, #350), eight on a narrower desktop (from 64em). They are drawn by `LinkPreviewCardComponent`, so
 * they look like the library's cards. Each lane is a seeded scatter (`layoutDriftLane`): every
 * card has its own spot, size, tilt and float, some hang over the window edge, small far cards
 * fill the gaps and may tuck slightly behind nearer ones, and none ever reaches under the sign-in
 * card. Three depth layers: far ones are smaller, dimmer and slower and lean less toward the
 * pointer, near ones larger and livelier. Every visit they fly out from behind the sign-in card
 * in a staggered wave and settle (the sign-in card never waits for them), then each floats on its
 * own loop (speed, amplitude and phase differ, so they never move in sync) and in turn
 * "lands" with an accent ring like a newly saved link (the ring of the phone mosaic). With a
 * mouse the cards also lean toward the pointer, as parallax by layer (on an inner element, so it
 * composes with the float; one `pointermove` listener, throttled to a frame). Reduced motion (the
 * device or the Animations setting, `ReducedMotion`) leaves them at rest in their lanes, tilted,
 * with no fly-in, no drift and no listener. Everything that moves is `transform` / `opacity`.
 * Decorative: hidden from assistive technology and inert.
 */
@Component({
  selector: 'app-sign-in-drift',
  imports: [TranslocoPipe, LinkPreviewCardComponent],
  templateUrl: './sign-in-drift.component.html',
  styleUrl: './sign-in-drift.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', inert: '' },
})
export class SignInDriftComponent {
  private readonly viewport = inject(ViewportService);

  /** Which set of cards: eight below 80em, fourteen from 80em, twenty-two from 160em. */
  private readonly tier = computed<SignInDriftTier>(() => {
    if (this.viewport.huge()) {
      return SIGN_IN_DRIFT_TIER.Huge;
    }
    return this.viewport.wide() ? SIGN_IN_DRIFT_TIER.Wide : SIGN_IN_DRIFT_TIER.Narrow;
  });

  protected readonly wide = computed(() => this.tier() !== SIGN_IN_DRIFT_TIER.Narrow);

  private readonly transloco = inject(TranslocoService);

  protected readonly lanes = computed<SignInDriftLane[]>(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    return cachedLayout(this.tier()).map((lane) => ({
      ...lane,
      cards: lane.cards.map((item): SignInDriftItem => ({
        ...item,
        tags: item.card.tags.map((tag) => this.transloco.translate(`auth.signIn.tags.${tag}`)),
      })),
    }));
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly motion = inject(ReducedMotion);
  private readonly injector = inject(Injector);

  constructor() {
    const view = this.host.ownerDocument.defaultView;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!view?.matchMedia) {
        return;
      }
      const stop = this.watchPointer(view);
      destroyRef.onDestroy(stop);
    });
  }

  /** Listens while the media queries allow it; returns the cleanup. */
  private watchPointer(view: Window): () => void {
    const hover = view.matchMedia(HOVER_QUERY);
    const doc = this.host.ownerDocument;
    let frame = 0;
    let latest: { x: number; y: number } | null = null;
    let listening = false;

    const apply = (): void => {
      frame = 0;
      const pointer = latest;
      // Every read first, then every write: no layout is forced between two cards.
      const tilts = this.tiltElements();
      const vectors = tilts.map((tilt) => {
        const rect = pointer ? tilt.parentElement?.getBoundingClientRect() : undefined;
        return pointer && rect ? tiltVector(pointer, rect) : { x: 0, y: 0 };
      });
      tilts.forEach((tilt, i) => {
        tilt.style.setProperty('--tx', vectors[i].x.toFixed(3));
        tilt.style.setProperty('--ty', vectors[i].y.toFixed(3));
      });
    };
    const schedule = (): void => {
      frame ||= view.requestAnimationFrame(apply);
    };
    const onMove = (event: PointerEvent): void => {
      latest = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const onLeave = (): void => {
      latest = null;
      schedule();
    };

    const sync = (): void => {
      const allowed = hover.matches && !this.motion.reduced();
      if (allowed && !listening) {
        doc.addEventListener('pointermove', onMove, { passive: true });
        doc.documentElement.addEventListener('pointerleave', onLeave);
      } else if (!allowed && listening) {
        doc.removeEventListener('pointermove', onMove);
        doc.documentElement.removeEventListener('pointerleave', onLeave);
        latest = null;
        apply();
      }
      listening = allowed;
    };

    sync();
    hover.addEventListener('change', sync);
    const watcher = effect(
      () => {
        this.motion.reduced();
        untracked(sync);
      },
      { injector: this.injector },
    );
    return () => {
      hover.removeEventListener('change', sync);
      watcher.destroy();
      doc.removeEventListener('pointermove', onMove);
      doc.documentElement.removeEventListener('pointerleave', onLeave);
      if (frame) {
        view.cancelAnimationFrame(frame);
      }
    };
  }

  private tiltElements(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>('.sd-tilt'));
  }
}
