import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  IllustrationComponent,
  KEYBOARD_KEY,
  StepsComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { ViewportService } from '../../core/layout/viewport.service';
import { ONBOARDING_RESULT } from './models/onboarding-result.const';
import type { OnboardingResult } from './models/onboarding-result.type';
import { ONBOARDING_STEPS } from './models/onboarding-steps.const';

/**
 * The welcome tour (opened by `OnboardingStore`): three steps with a scene each, Skip, Back and
 * Next; the last step offers "Add your first link". Esc and the scrim count as Skip (the dialog
 * resolves `undefined`). Focus stays on the primary button across steps; a polite live region
 * announces "Step N of M: title" (the `ui-steps` dots are an image with that position as name).
 * ArrowLeft / ArrowRight move between steps. The step slides in 24px and fades, direction aware;
 * reduced motion shows it at once.
 */
@Component({
  selector: 'app-onboarding-dialog',
  imports: [TranslocoPipe, ButtonComponent, DialogComponent, IllustrationComponent, StepsComponent],
  host: { '(keydown)': 'onKeydown($event)' },
  templateUrl: './onboarding-dialog.component.html',
  styleUrl: './onboarding-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingDialogComponent {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly count = ONBOARDING_STEPS.length;

  private readonly ref = inject<UiDialogRef<OnboardingResult>>(UiDialogRef);
  /** Phone: the footer buttons span the sheet (MobileWelcome). */
  protected readonly phone = inject(ViewportService).phone;
  private readonly injector = inject(Injector);
  private readonly nextButton = viewChild.required<ButtonComponent>('nextButton');

  /** Current step, starting at 1. */
  protected readonly current = signal(1);
  /** The last move was Back: the next step slides in from the left. */
  protected readonly backwards = signal(false);

  protected readonly content = computed(() => ONBOARDING_STEPS[this.current() - 1]);
  /** One entry, keyed by the step: a new step is a new element, so its entrance animation runs. */
  protected readonly shown = computed(() => [this.content()]);
  protected readonly first = computed(() => this.current() === 1);
  protected readonly last = computed(() => this.current() === this.count);

  protected next(): void {
    if (this.last()) {
      this.ref.close(ONBOARDING_RESULT.AddLink);
    } else {
      this.go(1);
    }
  }

  protected back(): void {
    this.go(-1);
  }

  protected skip(): void {
    this.ref.close(ONBOARDING_RESULT.Skipped);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === KEYBOARD_KEY.ArrowRight) {
      event.preventDefault();
      this.go(1);
    } else if (event.key === KEYBOARD_KEY.ArrowLeft) {
      event.preventDefault();
      this.go(-1);
    }
  }

  /** Arrow keys stop at the ends; only the buttons leave the dialog. */
  private go(delta: 1 | -1): void {
    const target = this.current() + delta;
    if (target < 1 || target > this.count) {
      return;
    }
    this.backwards.set(delta === -1);
    this.current.set(target);
    if (target === 1) {
      // Back leaves the DOM on the first step: the primary button takes the focus, so the
      // keyboard (arrows included) keeps working inside the dialog.
      afterNextRender(
        () => {
          this.nextButton().focus();
        },
        { injector: this.injector },
      );
    }
  }
}
