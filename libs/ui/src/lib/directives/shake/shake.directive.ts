import { Directive, effect, ElementRef, inject, input, untracked } from '@angular/core';

/**
 * Shakes the host sideways once (320 ms, `ui-shake`) each time the counter goes up: a field whose
 * error appears on submit, a sign-in error. The feature bumps the counter on a failed submit only,
 * so typing never shakes. The first value is the starting point and does not play. Reduced
 * motion (device or Settings › Animations) turns the movement off in CSS; the error border stays.
 *
 * `<ui-input [uiShake]="urlShakes()" />`
 */
@Directive({ selector: '[uiShake]' })
export class ShakeDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** A counter; every increase replays the shake. */
  readonly uiShake = input(0);

  constructor() {
    let previous: number | null = null;
    effect(() => {
      const count = this.uiShake();
      untracked(() => {
        if (previous !== null && count > previous) {
          this.play();
        }
        previous = count;
      });
    });
  }

  private play(): void {
    const list = this.host.classList;
    list.remove('ui-shake');
    // Reading a layout property restarts the animation when the class comes back in one frame.
    void this.host.offsetWidth;
    list.add('ui-shake');
    this.host.addEventListener('animationend', () => list.remove('ui-shake'), { once: true });
  }
}
