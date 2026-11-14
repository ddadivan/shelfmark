import type { BaseHarnessFilters } from '@angular/cdk/testing';
import type { ButtonVariant } from '../../models/button-variant.type';

/** Filters for `UiButtonHarness.with()`. */
export interface ButtonHarnessFilters extends BaseHarnessFilters {
  /** Visible text of the button (the projected label). */
  readonly text?: string | RegExp;
  /** `aria-label` of the inner control (icon-only buttons). */
  readonly label?: string | RegExp;
  /** Text or `aria-label`, whichever the button has: what a screen reader announces. */
  readonly name?: string | RegExp;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
}
