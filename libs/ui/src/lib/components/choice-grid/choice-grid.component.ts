import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  numberAttribute,
  input,
  model,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { folderColourShades } from '../../utils/folder-colour/folder-colour';
import { parseHex } from '../../utils/colour-contrast/colour-contrast';
import { nextFieldId } from '../field/field-ids';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import type { FolderColour } from '../folder-icon/models/folder-colour.type';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { CHOICE_GRID_KIND } from './models/choice-grid-kind.const';
import type { ChoiceGridKind } from './models/choice-grid-kind.type';
import type { ChoiceOption } from './models/choice-option.interface';

/**
 * Choose one of many small visual options: round colour swatches (`kind="swatch"`, each option
 * has its `colour`) or icon tiles (`kind="icon"`, each option has its `icon`, drawn in the tile
 * `colour` of the group). Native radios behind the drawing: the arrow keys move and select, Tab
 * enters the checked option (the first when none is checked), and each option is named by its
 * `label`. Name the group with `ariaLabel` or `ariaLabelledby`. Bind with `[formField]` or
 * `[(value)]`. An option with a `removeLabel` (an own colour) can be deleted: see `removed`.
 */
@Component({
  selector: 'ui-choice-grid',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-choice-grid',
    '[class.ui-choice-grid--swatch]': 'kind() === CHOICE_GRID_KIND.Swatch',
    '[class.ui-choice-grid--icon]': 'kind() === CHOICE_GRID_KIND.Icon',
    '[class.ui-choice-grid--disabled]': 'disabled()',
    '[class.ui-choice-grid--single-line]': 'singleLine()',
    '[class.ui-choice-grid--columns]': 'columns() > 0',
    '[style.--ui-choice-columns]': 'columns() > 0 ? columns() : null',
    role: 'radiogroup',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './choice-grid.component.html',
  styleUrl: './choice-grid.component.scss',
})
export class ChoiceGridComponent implements FormValueControl<string> {
  protected readonly CHOICE_GRID_KIND = CHOICE_GRID_KIND;
  protected readonly ICON_SIZE = ICON_SIZE;

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  /** Value of the selected option; empty when none is selected. */
  readonly value = model('');
  readonly options = input.required<readonly ChoiceOption[]>();
  readonly kind = input<ChoiceGridKind>(CHOICE_GRID_KIND.Swatch);
  /** Icons only: the colour of every icon tile. */
  readonly colour = input<FolderColour | string>(FOLDER_COLOUR.Graphite);
  /** Swatches: all options stay on one line, each shrinking from 36px (24px at the least) to fit. */
  readonly singleLine = input(false, { transform: booleanAttribute });
  /** Icons: a fixed number of equal columns instead of as many 40px tiles as fit (0 = automatic). */
  readonly columns = input(0, { transform: numberAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Form field name; the native radios share it. Generated when empty. */
  readonly name = input('');
  /** Accessible name of the group when no visible heading names it. */
  readonly ariaLabel = input('');
  /** Id of the element that names the group. */
  readonly ariaLabelledby = input('');
  /** Emits when focus leaves the group; `[formField]` marks the field touched. */
  readonly touch = output<void>();
  /** An option with a `removeLabel` was removed (the "×" or Delete / Backspace): its `value`. */
  readonly removed = output<string>();

  protected readonly groupId = nextFieldId('ui-choice');

  /** Focuses the checked radio, or the first one when none is checked. */
  focus(options?: FocusOptions): void {
    const radio =
      this.host.querySelector<HTMLInputElement>('input:checked') ??
      this.host.querySelector<HTMLInputElement>('input');
    radio?.focus(options);
  }

  protected select(option: ChoiceOption): void {
    this.value.set(option.value);
  }

  /** The "×" of a removable option. */
  protected remove(event: Event, option: ChoiceOption): void {
    event.preventDefault();
    event.stopPropagation();
    this.emitRemoved(option);
  }

  /** Delete or Backspace on the focused radio of a removable option. */
  protected onKeydown(event: KeyboardEvent, option: ChoiceOption): void {
    if (
      option.removeLabel &&
      (event.key === KEYBOARD_KEY.Delete || event.key === KEYBOARD_KEY.Backspace)
    ) {
      event.preventDefault();
      this.emitRemoved(option);
    }
  }

  /** Emits, then keeps focus in the group: on the option that took the removed one's place. */
  private emitRemoved(option: ChoiceOption): void {
    const index = this.options().findIndex((item) => item.value === option.value);
    this.removed.emit(option.value);
    afterNextRender(
      {
        read: () => {
          const radios = this.host.querySelectorAll<HTMLInputElement>('input');
          radios[Math.min(index, radios.length - 1)]?.focus();
        },
      },
      { injector: this.injector },
    );
  }

  /** The built-in colour name that styles the option; an own `#rrggbb` has none (`own`). */
  protected tone(option: ChoiceOption): string {
    const colour = option.colour ?? this.colour();
    return parseHex(colour) ? 'own' : colour;
  }

  /**
   * An own colour (`#rrggbb`) as the option's glyph colour (CSSOM, no style attribute): a swatch
   * paints the colour itself, an icon tile its readable shade (`light-dark()` by the theme).
   */
  protected ownGlyph(option: ChoiceOption): string | null {
    const colour = option.colour ?? this.colour();
    if (!parseHex(colour)) {
      return null;
    }
    if (this.kind() === CHOICE_GRID_KIND.Swatch) {
      return colour;
    }
    const shades = folderColourShades(colour);
    return shades ? `light-dark(${shades.light.glyph}, ${shades.dark.glyph})` : null;
  }

  /** The tint behind an icon of an own colour, light and dark. */
  protected ownTile(option: ChoiceOption): string | null {
    const shades = folderColourShades(option.colour ?? this.colour());
    return shades && this.kind() !== CHOICE_GRID_KIND.Swatch
      ? `light-dark(${shades.light.tile}, ${shades.dark.tile})`
      : null;
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !this.host.contains(event.relatedTarget)) {
      this.touch.emit();
    }
  }
}
