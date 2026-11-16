import type { PopupError } from './popup-error.type';
import type { PopupStep } from './popup-step.type';

/** A failed load or save: why, and whether Try again makes sense (a full library will not change). */
export interface PopupFailure {
  error: PopupError;
  step: PopupStep;
  retryable: boolean;
}
