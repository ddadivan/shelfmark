import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { nextFieldId } from '../field/field-ids';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { IconComponent } from '../icon/icon.component';
import { parseHex } from '../theme/colour-contrast';

/** What the native picker starts on before a colour is chosen (the Ocean accent). */
const START_COLOUR = '#2e6a99';

/** `#rrggbb` (any case, with or without `#`) as lower-case `#rrggbb`, or `null`. */
function normalise(text: string): string | null {
  const trimmed = text.trim();
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return parseHex(hex) ? hex.toLowerCase() : null;
}

/**
 * An own colour (Settings › Appearance, Themes mockup: the "+" accent swatch, #315). A round swatch
 * button (a colour wheel with "+", or the chosen colour) discloses a panel with the system colour
 * picker (a native `<input type="color">`, keyboard operable everywhere) and a hex field for typing
 * or pasting `#rrggbb`. `value` follows every change (dragging in the system picker too) for live
 * samples; `committed` emits a finished choice (the system picker closed, Enter or leaving a valid
 * hex field), the moment to save. Projected content shows under the fields (a contrast warning).
 * Esc in the panel closes it and returns focus to the swatch. Every string comes in translated.
 */
@Component({
  selector: 'ui-color-picker',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-color-picker',
    '[class.ui-color-picker--open]': 'open()',
  },
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss',
})
export class ColorPickerComponent implements FormValueControl<string> {
  protected readonly ICON_SIZE = ICON_SIZE;
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  /** The colour as lower-case `#rrggbb`; empty when none is chosen. */
  readonly value = model('');
  /** Whether the panel is shown. */
  readonly open = model(false);
  /** Draws the checked ring: the own colour is the current choice. */
  readonly selected = input(false, { transform: booleanAttribute });
  /** Accessible name of the swatch and the panel ("Your own colour"). */
  readonly label = input.required<string>();
  /** Label of the system colour picker ("Choose a colour"). */
  readonly pickerLabel = input.required<string>();
  /** Label of the hex field ("Hex code"). */
  readonly hexLabel = input.required<string>();
  /** Shown when the hex field holds something that is not a colour. */
  readonly invalidMessage = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** A finished choice, lower-case `#rrggbb`. */
  readonly committed = output<string>();
  /** Emits when focus leaves the control; `[formField]` marks the field touched. */
  readonly touch = output<void>();

  protected readonly panelId = nextFieldId('ui-color-picker-panel');
  protected readonly hexId = nextFieldId('ui-color-picker-hex');
  protected readonly errorId = nextFieldId('ui-color-picker-error');

  /** The hex field's text; follows the value until the person types. */
  protected readonly draft = linkedSignal(() => this.value());
  protected readonly hexInvalid = computed(() => {
    const text = this.draft().trim();
    return text !== '' && normalise(text) === null;
  });
  protected readonly nativeValue = computed(() => this.value() || START_COLOUR);

  /** Focuses the swatch. */
  focus(options?: FocusOptions): void {
    this.swatch()?.focus(options);
  }

  protected toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.open.set(true);
    // Into the panel: the hex field, the route that works the same on every system.
    afterNextRender(
      { read: () => this.host.querySelector<HTMLInputElement>(`#${this.hexId}`)?.focus() },
      { injector: this.injector },
    );
  }

  protected close(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.open.set(false);
    this.focus();
  }

  /** Dragging in the system picker: live value, no commit yet. */
  protected onPickerInput(event: Event): void {
    const colour = normalise((event.target as HTMLInputElement).value);
    if (colour) {
      this.value.set(colour);
    }
  }

  /** The system picker closed on a colour. */
  protected onPickerChange(event: Event): void {
    const colour = normalise((event.target as HTMLInputElement).value);
    if (colour) {
      this.value.set(colour);
      this.committed.emit(colour);
    }
  }

  protected onHexInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  /** Enter or leaving the hex field: a valid colour is a choice, anything else stays to fix. */
  protected commitHex(event?: Event): void {
    event?.preventDefault();
    const colour = normalise(this.draft());
    if (!colour) {
      return;
    }
    this.draft.set(colour);
    if (colour !== this.value()) {
      this.value.set(colour);
    }
    this.committed.emit(colour);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !this.host.contains(event.relatedTarget)) {
      this.touch.emit();
    }
  }

  private swatch(): HTMLButtonElement | null {
    return this.host.querySelector<HTMLButtonElement>('.ui-color-picker__swatch');
  }
}
