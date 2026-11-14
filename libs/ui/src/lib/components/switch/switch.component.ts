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
import type { FormCheckboxControl } from '@angular/forms/signals';

/**
 * Turns a single setting on or off at once, with no Save button (Switch spec). A native
 * `<button type="button" role="switch">`, so Space and Enter toggle it. The visible text belongs
 * to the row around it; `label` is the accessible name. Implements `FormCheckboxControl`: bind
 * with `<ui-switch label="Show notes" [formField]="form.notes" />`, or `[(checked)]` without a form.
 */
@Component({
  selector: 'ui-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-switch',
    '[class.ui-switch--checked]': 'checked()',
    '[class.ui-switch--disabled]': 'disabled()',
  },
  templateUrl: './switch.component.html',
  styleUrl: './switch.component.scss',
})
export class SwitchComponent implements FormCheckboxControl {
  readonly checked = model(false);
  /** Accessible name; the row shows the visible text. */
  readonly label = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Emits on blur; `[formField]` marks the field touched. */
  readonly touch = output<void>();

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Focuses the native button. */
  focus(options?: FocusOptions): void {
    this.host.querySelector('button')?.focus(options);
  }

  protected toggle(): void {
    this.checked.update((on) => !on);
  }
}
