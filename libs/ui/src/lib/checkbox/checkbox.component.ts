import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';
import { UiFieldControl } from '../field/field-control.directive';
import { fieldErrorId, fieldHintId } from '../field/field-ids';
import { IconComponent } from '../icon/icon.component';

/**
 * A native `<input type="checkbox">` with a visible label, an optional hint and an error
 * message ("Add to favorites" in the edit dialog). Space toggles it; the label is part of the
 * hit area. Implements `FormCheckboxControl`: bind with
 * `<ui-checkbox label="…" [formField]="form.favorite" />`, or `[(checked)]` without a form.
 * `indeterminate` is the mixed state of a parent that selects children; it is exposed through
 * the native property and clears on the next toggle.
 */
@Component({
  selector: 'ui-checkbox',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-checkbox',
    '[class.ui-checkbox--checked]': 'checked()',
    '[class.ui-checkbox--disabled]': 'disabled()',
    '[class.ui-checkbox--invalid]': 'showInvalid()',
  },
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
})
export class CheckboxComponent extends UiFieldControl implements FormCheckboxControl {
  readonly checked = model(false);
  /** Mixed state; shown as a dash. */
  readonly indeterminate = model(false);
  /** Form field name of the native input. */
  readonly name = input('');

  protected readonly hintId = fieldHintId(this.controlId);
  protected readonly errorId = fieldErrorId(this.controlId);

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Focuses the native checkbox. */
  focus(options?: FocusOptions): void {
    this.host.querySelector<HTMLInputElement>('input')?.focus(options);
  }

  protected onChange(checked: boolean): void {
    this.indeterminate.set(false);
    this.checked.set(checked);
  }
}
