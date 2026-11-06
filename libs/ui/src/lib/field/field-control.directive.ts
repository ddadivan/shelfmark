import { booleanAttribute, computed, Directive, input, output } from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';
import { fieldDescribedBy, nextFieldId } from './field-ids';

/**
 * Base of every field that sits in `ui-field-shell` (`ui-input`, `ui-textarea`, later
 * `ui-select` and `ui-tag-input`). It holds the Signal Forms side of the contract that is
 * the same for all of them (`FormUiControl`): the `[formField]` directive writes `disabled`,
 * `required`, `errors` and `touched` into these inputs and listens to `touch`. A subclass adds
 * its `value` model, implements `FormValueControl<T>` and renders `ui-field-shell`.
 *
 * Errors are shown after the field is touched (blur or submit), so a pristine form is calm.
 * The feature supplies already translated messages on its validators; `error` is a manual
 * message for use without a form and always wins.
 */
@Directive()
export abstract class UiFieldControl {
  /** Visible label above the control. */
  readonly label = input.required<string>();
  readonly hint = input('');
  /** Manual error message, shown at once; use it without Signal Forms. */
  readonly error = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Sets `aria-required`; the visible hint or label says what is needed. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Validation errors of the bound field (set by `[formField]`). */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  /** Whether the bound field is touched (set by `[formField]`). */
  readonly touched = input(false, { transform: booleanAttribute });
  /** Emits on blur; `[formField]` marks the field touched. */
  readonly touch = output<void>();

  protected readonly controlId: string = nextFieldId('ui-field');

  /** The message to show: the manual error, else the first message of a touched field. */
  protected readonly message = computed(
    () =>
      this.error() || (this.touched() ? (this.errors().find((e) => e.message)?.message ?? '') : ''),
  );

  /** The field is in the error state: a manual error, or a touched field with any error. */
  protected readonly showInvalid = computed(
    () => !!this.error() || (this.touched() && this.errors().length > 0),
  );

  protected readonly describedBy = computed(() =>
    fieldDescribedBy(this.controlId, {
      hint: !!this.hint(),
      error: !!this.message(),
      counter: this.counterText() !== '',
    }),
  );

  /** Counter text for the shell; a field with a counter overrides it. */
  protected counterText(): string {
    return '';
  }
}
