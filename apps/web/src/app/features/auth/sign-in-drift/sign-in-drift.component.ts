import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FaviconComponent, ReducedMotion } from '@shelfmark/ui';
import { SIGN_IN_DRIFT_CARDS } from './models/sign-in-drift-cards.const';
import { tiltVector } from './tilt-vector';

/** Tilt only where a precise hovering pointer exists, and never for people who want less motion. */
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * Four saved-link cards that drift around the glass sign-in card on a desktop
 * (docs/design/screens/SignIn.dc.html). Each floats on its own slow loop, enters once, and in
 * turn "lands" with an accent ring like a newly saved link (the ring of the phone mosaic).
 * With a mouse the cards also lean toward the pointer (on an inner element, so it composes with
 * the float; one `pointermove` listener, throttled to a frame). Reduced motion (the device or the Animations setting, `ReducedMotion`) keeps
 * them still, tilted, with no listener. Decorative: hidden from assistive technology.
 */
@Component({
  selector: 'app-sign-in-drift',
  imports: [TranslocoPipe, FaviconComponent],
  templateUrl: './sign-in-drift.component.html',
  styleUrl: './sign-in-drift.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class SignInDriftComponent {
  protected readonly SIGN_IN_DRIFT_CARDS = SIGN_IN_DRIFT_CARDS;

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
