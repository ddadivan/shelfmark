import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { FormValueControl } from '@angular/forms/signals';
import { nextFieldId } from '../field/field-ids';
import { THEME } from '../../models/theme/models/theme.const';
import { THEME_PICKER_KIND } from './models/theme-picker-kind.const';
import type { ThemePickerKind } from './models/theme-picker-kind.type';
import type { ThemePickerOption } from './models/theme-picker-option.interface';

/** `ThemePickerOption.theme` value that draws both fixed themes side by side. */
const SYSTEM = 'system';

/**
 * Choose a theme, an accent colour or a background (Settings › Appearance, Themes mockup). Each
 * option is drawn under its own theme attributes (`data-theme`, `data-custom-*`), so the drawing
 * shows the real token values of that choice and needs no inline colours (strict CSP). Native
 * radios behind the drawing: the arrow keys move and select, Tab enters the checked option, and
 * each option is named by its `label` (also the caption of theme and background options). Name
 * the group with `ariaLabel` or `ariaLabelledby`. Bind with `[formField]` or `[(value)]`.
 */
@Component({
  selector: 'ui-theme-picker',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-theme-picker',
    '[class.ui-theme-picker--theme]': 'kind() === THEME_PICKER_KIND.Theme',
    '[class.ui-theme-picker--accent]': 'kind() === THEME_PICKER_KIND.Accent',
    '[class.ui-theme-picker--background]': 'kind() === THEME_PICKER_KIND.Background',
    role: 'radiogroup',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
})
export class ThemePickerComponent implements FormValueControl<string> {
  protected readonly THEME_PICKER_KIND = THEME_PICKER_KIND;
  protected readonly THEME = THEME;
  protected readonly SYSTEM = SYSTEM;

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Value of the selected option; empty when none is selected. */
  readonly value = model('');
  readonly options = input.required<readonly ThemePickerOption[]>();
  readonly kind = input<ThemePickerKind>(THEME_PICKER_KIND.Theme);
  /** Form field name; the native radios share it. Generated when empty. */
  readonly name = input('');
  /** Accessible name of the group when no visible heading names it. */
  readonly ariaLabel = input('');
  /** Id of the element that names the group. */
  readonly ariaLabelledby = input('');
  /** Emits when focus leaves the group; `[formField]` marks the field touched. */
  readonly touch = output<void>();

  protected readonly groupId = nextFieldId('ui-theme-picker');

  /** Focuses the checked radio, or the first one when none is checked. */
  focus(options?: FocusOptions): void {
    const radio =
      this.host.querySelector<HTMLInputElement>('input:checked') ??
      this.host.querySelector<HTMLInputElement>('input');
    radio?.focus(options);
  }

  protected select(option: ThemePickerOption): void {
    this.value.set(option.value);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !this.host.contains(event.relatedTarget)) {
      this.touch.emit();
    }
  }
}
