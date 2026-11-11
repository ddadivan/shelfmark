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
import { activeLang } from '../../../core/i18n/active-lang';
import { ViewportService } from '../../../core/layout/viewport.service';
import { LinkPreviewCardComponent } from '../../links/link-preview-card/link-preview-card.component';
import { SIGN_IN_DRIFT_CARDS } from './models/sign-in-drift-cards.const';
import type { SignInDriftItem } from './models/sign-in-drift-item.interface';
import type { SignInDriftLane } from './models/sign-in-drift-lane.interface';
import { SIGN_IN_DRIFT_SIDE } from './models/sign-in-drift-side.const';
import { tiltVector } from './tilt-vector';

/** Tilt only where a precise hovering pointer exists, and never for people who want less motion. */
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/** Rows a lane is split into: a card takes two (wide) or one of three (narrow). */
const WIDE_ROWS = 6;
const NARROW_ROWS = 3;

/**
 * Saved-link cards that drift in the two side lanes of the glass sign-in card on a desktop
 * (docs/design/screens/SignIn.dc.html): ten on a wide screen, six on a narrower desktop
 * (from 64em, `ViewportService.wideDesktop`). They are drawn by `LinkPreviewCardComponent`, so
 * they look like the library's cards, and sit in three depth layers: far ones are smaller,
 * dimmer and slower and lean less toward the pointer, near ones larger and livelier. Every
 * visit they fly out from behind the sign-in card in a staggered wave and settle in their lanes
 * (the sign-in card never waits for them), then each floats on its own slow loop and in turn
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
  /** Ten cards from 80em, six on the narrower desktops. */
  protected readonly wide = inject(ViewportService).wideDesktop;

  private readonly transloco = inject(TranslocoService);

  protected readonly lanes = computed<SignInDriftLane[]>(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    const wide = this.wide();
    const items = SIGN_IN_DRIFT_CARDS.flatMap((card, index): SignInDriftItem[] => {
      if (!wide && card.narrowRow === null) {
        return [];
      }
      const row = wide ? card.row : (card.narrowRow ?? 1);
      const span = wide ? 2 : 1;
      const rows = wide ? WIDE_ROWS : NARROW_ROWS;
      const start = card.side === SIGN_IN_DRIFT_SIDE.Start;
      return [
        {
          card,
          index,
          column: !wide ? 1 : start ? card.column + 1 : 2 - card.column,
          row,
          span,
          outer: wide ? card.column : 0,
          centreY: (row - 1 + span / 2) / rows,
          tags: card.tags.map((tag) => this.transloco.translate(`auth.signIn.tags.${tag}`)),
        },
      ];
    });
    return Object.values(SIGN_IN_DRIFT_SIDE).map((side) => ({
      side,
      cards: items.filter((item) => item.card.side === side),
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
      for (const tilt of this.tiltElements()) {
        const rect = tilt.parentElement?.getBoundingClientRect();
        const vector = pointer && rect ? tiltVector(pointer, rect) : { x: 0, y: 0 };
        tilt.style.setProperty('--tx', vector.x.toFixed(3));
        tilt.style.setProperty('--ty', vector.y.toFixed(3));
      }
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
