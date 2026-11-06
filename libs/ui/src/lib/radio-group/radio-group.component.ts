import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { nextFieldId } from '../field/field-ids';
import type { RadioOption } from './models/radio-option.interface';
import type { RadioOrientation } from './models/radio-orientation.type';
import { RADIO_ORIENTATION } from './models/radio-orientation.const';

/**
 * Choose one of a few options, each with a title and an explanation (the delete-folder dialog).
 * Built on native `<input type="radio">` (Angular Aria 22 has no radio group): the arrow keys
 * move and select, Tab enters the checked option (or the first when none is checked), all
 * for free and in every browser. The safe option comes first and the feature selects it.
 *
 * Bind with `<ui-radio-group [options]="options" [formField]="form.mode" ariaLabelledby="…" />`.
 * Name the group with `ariaLabelledby` (id of the dialog heading) or `ariaLabel`.
 */
@Component({
  selector: 'ui-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-radio-group',
    '[class.ui-radio-group--row]': 'orientation() === RADIO_ORIENTATION.Horizontal',
    '[class.ui-radio-group--disabled]': 'disabled()',
    role: 'radiogroup',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './radio-group.component.html',
  styleUrl: './radio-group.component.scss',
})
export class RadioGroupComponent implements FormValueControl<string> {
  protected readonly RADIO_ORIENTATION = RADIO_ORIENTATION;

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Value of the selected option; empty when none is selected. */
  readonly value = model('');
  readonly options = input.required<readonly RadioOption[]>();
  readonly orientation = input<RadioOrientation>(RADIO_ORIENTATION.Vertical);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Form field name; the native radios share it. Generated when empty. */
  readonly name = input('');
  /** Accessible name of the group when no visible heading names it. */
  readonly ariaLabel = input('');
  /** Id of the element that names the group, for example the dialog heading. */
  readonly ariaLabelledby = input('');
  /** Emits when focus leaves the group; `[formField]` marks the field touched. */
  readonly touch = output<void>();

  protected readonly groupId = nextFieldId('ui-radio');

  /** Focuses the checked radio, or the first one when none is checked. */
  focus(options?: FocusOptions): void {
    const radio =
      this.host.querySelector<HTMLInputElement>('input:checked') ??
      this.host.querySelector<HTMLInputElement>('input');
    radio?.focus(options);
  }

  protected select(option: RadioOption): void {
    this.value.set(option.value);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !this.host.contains(event.relatedTarget)) {
      this.touch.emit();
    }
  }
}
