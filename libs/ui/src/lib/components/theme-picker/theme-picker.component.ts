import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { FormValueControl } from '@angular/forms/signals';
import { nextFieldId } from '../field/field-ids';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { IconComponent } from '../icon/icon.component';
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
  imports: [NgTemplateOutlet, IconComponent],
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
  styleUrls: ['./theme-picker.component.scss', './theme-picker-remove.scss'],
})
export class ThemePickerComponent implements FormValueControl<string> {
  protected readonly THEME_PICKER_KIND = THEME_PICKER_KIND;
  protected readonly THEME = THEME;
  protected readonly SYSTEM = SYSTEM;
  protected readonly ICON_SIZE = ICON_SIZE;

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

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
  /** An option with a `removeLabel` was removed (the "×" or Delete / Backspace): its `value`. */
  readonly removed = output<string>();

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

  /** The "×" of a removable option. */
  protected remove(event: Event, option: ThemePickerOption): void {
    event.preventDefault();
    event.stopPropagation();
    this.emitRemoved(option);
  }

  /** Delete or Backspace on the focused radio of a removable option. */
  protected onKeydown(event: KeyboardEvent, option: ThemePickerOption): void {
    if (
      option.removeLabel &&
      (event.key === KEYBOARD_KEY.Delete || event.key === KEYBOARD_KEY.Backspace)
    ) {
      event.preventDefault();
      this.emitRemoved(option);
    }
  }

  /** Emits, then keeps focus in the group: on the option that took the removed one's place. */
  private emitRemoved(option: ThemePickerOption): void {
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

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !this.host.contains(event.relatedTarget)) {
      this.touch.emit();
    }
  }
}
