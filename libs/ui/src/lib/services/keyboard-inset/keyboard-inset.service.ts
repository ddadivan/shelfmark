import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Service } from '@angular/core';
import { keyboardInset } from './keyboard-inset';
import { KEYBOARD_INSET_PROPERTY } from './models/keyboard-inset-property.const';

/**
 * Keeps `--ui-keyboard-inset` on `<html>` equal to the height the on-screen keyboard covers, from
 * the visual viewport (CSSOM, CSP-safe). The keyboard shrinks only the visual viewport, so `dvh`
 * and the CDK overlay positions still count the hidden part: bottom sheets, the full-screen phone
 * dialog and popups subtract this value to stay above it. Created by `UiOverlay` and
 * `DialogService`, so every overlay starts it; without a visual viewport it does nothing.
 */
@Service()
export class KeyboardInset {
  private readonly document = inject(DOCUMENT);
  private current = 0;

  constructor() {
    const view = this.document.defaultView;
    const viewport = view?.visualViewport;
    if (!viewport) {
      return;
    }
    const update = (): void =>
      this.apply(keyboardInset(this.document.documentElement.clientHeight, viewport));
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    update();
    inject(DestroyRef).onDestroy(() => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      this.document.documentElement.style.removeProperty(KEYBOARD_INSET_PROPERTY);
    });
  }

  /** The covered height in px (0 without a keyboard). */
  get inset(): number {
    return this.current;
  }

  private apply(inset: number): void {
    if (
      inset === this.current &&
      this.document.documentElement.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)
    ) {
      return;
    }
    this.current = inset;
    this.document.documentElement.style.setProperty(KEYBOARD_INSET_PROPERTY, `${inset}px`);
  }
}
