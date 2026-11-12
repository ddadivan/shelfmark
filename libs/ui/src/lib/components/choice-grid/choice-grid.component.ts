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
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import type { FolderColour } from '../folder-icon/models/folder-colour.type';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { CHOICE_GRID_KIND } from './models/choice-grid-kind.const';
import type { ChoiceGridKind } from './models/choice-grid-kind.type';
import type { ChoiceOption } from './models/choice-option.interface';

/**
 * Choose one of many small visual options: round colour swatches (`kind="swatch"`, each option
 * has its `colour`) or icon tiles (`kind="icon"`, each option has its `icon`, drawn in the tile
 * `colour` of the group). Native radios behind the drawing: the arrow keys move and select, Tab
 * enters the checked option (the first when none is checked), and each option is named by its
 * `label`. Name the group with `ariaLabel` or `ariaLabelledby`. Bind with `[formField]` or
 * `[(value)]`.
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

  /** Value of the selected option; empty when none is selected. */
  readonly value = model('');
  readonly options = input.required<readonly ChoiceOption[]>();
  readonly kind = input<ChoiceGridKind>(CHOICE_GRID_KIND.Swatch);
  /** Icons only: the colour of every icon tile. */
  readonly colour = input<FolderColour>(FOLDER_COLOUR.Graphite);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Form field name; the native radios share it. Generated when empty. */
  readonly name = input('');
  /** Accessible name of the group when no visible heading names it. */
  readonly ariaLabel = input('');
  /** Id of the element that names the group. */
  readonly ariaLabelledby = input('');
  /** Emits when focus leaves the group; `[formField]` marks the field touched. */
  readonly touch = output<void>();

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

  protected tone(option: ChoiceOption): FolderColour {
    return option.colour ?? this.colour();
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !this.host.contains(event.relatedTarget)) {
      this.touch.emit();
    }
  }
}
