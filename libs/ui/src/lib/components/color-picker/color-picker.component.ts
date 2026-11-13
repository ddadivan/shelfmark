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
import { hexToHsv, hsvToHex, parseHex } from '../../utils/colour-contrast/colour-contrast';

/** What the picker starts on before a colour is chosen (the Ocean accent). */
const START_COLOUR = '#2e6a99';

/** `#rrggbb` (any case, with or without `#`) as lower-case `#rrggbb`, or `null`. */
function normalise(text: string): string | null {
  const trimmed = text.trim();
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return parseHex(hex) ? hex.toLowerCase() : null;
}

/**
 * An own colour (Settings › Appearance, Themes mockup: the "+" swatch, #315; the picker itself #335).
 * A round swatch button (a colour wheel with "+", or the chosen colour) discloses a panel (its
 * height opens, `enter(disclose)`) with a saturation / brightness area, a hue slider and a hex
 * field for typing or pasting `#rrggbb`. Pointer and touch drag in the area and on the slider;
 * the keyboard uses real sliders: in the area two visually hidden range inputs (saturation and
 * brightness, arrow keys, Page keys, Home and End) draw one handle, the hue slider is a native
 * range input. Every slider has its name and `aria-valuetext`. `value` follows every change for
 * live samples; `committed` emits a finished choice (the pointer released, Enter, a slider losing
 * focus, a valid hex field left, the panel closed after a change), the moment to save. Projected
 * content shows under the fields (a contrast warning). Esc in the panel closes it and returns focus
 * to the swatch. Every string comes in translated.
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
  styleUrls: [
    './color-picker.component.scss',
    './color-picker-area.scss',
    './color-picker-fields.scss',
  ],
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
  /** Accessible name of the whole picking area ("Colour"). */
  readonly pickerLabel = input.required<string>();
  /** Names of the sliders ("Saturation", "Brightness", "Hue"). */
  readonly saturationLabel = input.required<string>();
  readonly brightnessLabel = input.required<string>();
  readonly hueLabel = input.required<string>();
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
  /**
   * The picker's model. Kept while the value is the colour it produced itself, so the hue stays at
   * a grey or black (a hex cannot hold it); any other value starts it again.
   */
  protected readonly hsv = linkedSignal<string, readonly [number, number, number]>({
    source: () => this.value(),
    computation: (hex, previous) =>
      previous && hsvToHex(...previous.value) === hex
        ? previous.value
        : hexToHsv(parseHex(hex) ? hex : START_COLOUR),
  });
  protected readonly hue = computed(() => Math.round(this.hsv()[0]) % 360);
  protected readonly saturation = computed(() => Math.round(this.hsv()[1] * 100));
  protected readonly brightness = computed(() => Math.round(this.hsv()[2] * 100));
  /** The current colour of the handles (the start colour while none is chosen). */
  protected readonly shown = computed(() => this.value() || START_COLOUR);
  /** Fully saturated colour of the hue: the area's base. */
  protected readonly hueColour = computed(() => hsvToHex(this.hsv()[0], 1, 1));
  /** The value changed since the last commit. */
  private changed = false;
  /** The hex field was typed in: only then does leaving it commit. */
  private hexEdited = false;
  private dragging = false;

  /** Forgets the colour: the swatch is the wheel with "+" again and the fields start empty. */
  clear(): void {
    this.value.set('');
    this.draft.set('');
    this.changed = false;
    this.hexEdited = false;
  }

  /** Focuses the swatch. */
  focus(options?: FocusOptions): void {
    this.swatch()?.focus(options);
  }

  protected toggle(): void {
    if (this.open()) {
      this.commitIfChanged();
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
    this.commitIfChanged();
    this.open.set(false);
    this.focus();
  }

  /** Pointer or touch down in the area: the handle jumps there and follows until release. */
  protected areaDown(event: PointerEvent): void {
    const area = event.currentTarget as HTMLElement;
    if (this.disabled() || event.button > 0) {
      return;
    }
    event.preventDefault();
    area.setPointerCapture(event.pointerId);
    this.dragging = true;
    this.moveHandle(event, area);
    // Focus the brightness slider so the arrow keys continue from here.
    area.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }

  protected areaMove(event: PointerEvent): void {
    if (this.dragging) {
      this.moveHandle(event, event.currentTarget as HTMLElement);
    }
  }

  protected areaUp(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    this.commitIfChanged();
  }

  private moveHandle(event: PointerEvent, area: HTMLElement): void {
    const box = area.getBoundingClientRect();
    const s = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const v = 1 - Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    this.setHsv(this.hsv()[0], s, v);
  }

  /** The saturation slider (keyboard) of the area moved. */
  protected onSaturation(event: Event): void {
    const [h, , v] = this.hsv();
    this.setHsv(h, Number((event.target as HTMLInputElement).value) / 100, v);
  }

  /** The brightness slider (keyboard) of the area moved. */
  protected onBrightness(event: Event): void {
    const [h, s] = this.hsv();
    this.setHsv(h, s, Number((event.target as HTMLInputElement).value) / 100);
  }

  /** The hue slider moved (pointer, touch or keys). */
  protected onHue(event: Event): void {
    const [, s, v] = this.hsv();
    this.setHsv(Number((event.target as HTMLInputElement).value), s, v);
  }

  private setHsv(h: number, s: number, v: number): void {
    const hex = hsvToHex(h, s, v);
    this.changed = this.changed || hex !== this.value();
    this.hsv.set([h, s, v]);
    // The linked signal keeps the model while the value is what it produced.
    this.value.set(hex);
  }

  /** A slider let go (pointer released, Enter, focus left): the choice is finished. */
  protected sliderDone(event?: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
    }
    this.commitIfChanged();
  }

  private commitIfChanged(): void {
    if (this.changed && this.value() !== '') {
      this.changed = false;
      this.committed.emit(this.value());
    }
  }

  protected onHexInput(event: Event): void {
    this.hexEdited = true;
    this.draft.set((event.target as HTMLInputElement).value);
  }

  /** Enter or leaving the hex field: a valid colour is a choice, anything else stays to fix. */
  protected commitHex(event?: Event): void {
    event?.preventDefault();
    if (!event && !this.hexEdited) {
      return;
    }
    this.hexEdited = false;
    const colour = normalise(this.draft());
    if (!colour) {
      return;
    }
    this.draft.set(colour);
    if (colour !== this.value()) {
      this.value.set(colour);
    }
    this.changed = false;
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
