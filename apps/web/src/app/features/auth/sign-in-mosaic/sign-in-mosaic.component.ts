import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { FaviconComponent } from '@shelfmark/ui';
import { SIGN_IN_SLOT_ORDER } from './models/sign-in-slot-order.const';
import type { SignInSlot } from './models/sign-in-slot.type';
import { SIGN_IN_SWAPS } from './models/sign-in-swaps.const';
import { SIGN_IN_TILE_MARK } from './models/sign-in-tile-mark.const';
import { SIGN_IN_TILE_TONE } from './models/sign-in-tile-tone.const';
import { SIGN_IN_TILES } from './models/sign-in-tiles.const';
import { swapTiles } from './swap-tiles';

const SWAP_INTERVAL_MS = 4500;
const DESKTOP_QUERY = '(min-width: 64em)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Decorative mosaic of eight example links for the sign-in page (docs/design/screens/SignIn.dc.html).
 * On a desktop, the tiles trade places every few seconds, lean with the pointer and flip on click
 * to show the saved link. Below 64em it is a static band, and with `prefers-reduced-motion` the
 * tiles stay still. Hidden from assistive technology: nothing in it is focusable.
 */
@Component({
  selector: 'app-sign-in-mosaic',
  imports: [TranslocoPipe, FaviconComponent],
  templateUrl: './sign-in-mosaic.component.html',
  styleUrl: './sign-in-mosaic.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '(click)': 'flipAt($event)',
    '(pointermove)': 'tilt($event)',
    '(pointerleave)': 'untilt()',
  },
})
export class SignInMosaicComponent {
  protected readonly SIGN_IN_TILES = SIGN_IN_TILES;
  protected readonly SIGN_IN_TILE_TONE = SIGN_IN_TILE_TONE;
  protected readonly SIGN_IN_TILE_MARK = SIGN_IN_TILE_MARK;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly slots = signal<readonly SignInSlot[]>(SIGN_IN_SLOT_ORDER);
  private readonly flipped = signal<ReadonlySet<number>>(new Set());
  private hovering = false;
  private step = 0;

  constructor() {
    const timer = setInterval(() => this.tick(), SWAP_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected slot(index: number): SignInSlot {
    return this.slots()[index] ?? SIGN_IN_SLOT_ORDER[index];
  }

  protected isFlipped(index: number): boolean {
    return this.flipped().has(index);
  }

  /** Pointer only: the tiles are decorative, so the keyboard never reaches them. */
  protected flipAt(event: MouseEvent): void {
    const target = event.target;
    const tile = target instanceof Element ? target.closest<HTMLElement>('[data-tile]') : null;
    const index = Number(tile?.dataset['tile']);
    if (tile && this.canAnimate()) {
      this.flip(index);
    }
  }

  private flip(index: number): void {
    this.flipped.update((set) => {
      const next = new Set(set);
      if (!next.delete(index)) {
        next.add(index);
      }
      return next;
    });
  }

  protected tilt(event: PointerEvent): void {
    this.hovering = true;
    const rect = this.host.getBoundingClientRect();
    this.host.style.setProperty(
      '--px',
      ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3),
    );
    this.host.style.setProperty(
      '--py',
      ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3),
    );
  }

  protected untilt(): void {
    this.hovering = false;
    this.host.style.setProperty('--px', '0');
    this.host.style.setProperty('--py', '0');
  }

  private tick(): void {
    if (this.hovering || !this.canAnimate()) {
      return;
    }
    const pair = SIGN_IN_SWAPS[this.step % SIGN_IN_SWAPS.length];
    this.step += 1;
    this.slots.update((slots) => swapTiles(slots, pair));
  }

  /** Only on a desktop layout, and not for people who asked for less motion. */
  private canAnimate(): boolean {
    const view = this.host.ownerDocument.defaultView;
    if (!view?.matchMedia) {
      return false;
    }
    return view.matchMedia(DESKTOP_QUERY).matches && !view.matchMedia(REDUCED_MOTION_QUERY).matches;
  }
}
