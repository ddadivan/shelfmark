import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { nextFieldId } from '../../field/field-ids';
import { THEME } from '../../../models/theme/models/theme.const';
import { READER_THEME } from '../models/reader-theme.const';
import type { ReaderTheme } from '../models/reader-theme.type';
import type { ReaderThemeOption } from './models/reader-theme-option.interface';

/**
 * The Theme row of Reading settings (Shelf ReaderView): one "Aa" tile per Reader theme with its
 * name under it. Each tile is drawn under that theme's own tokens (`data-theme` plus
 * `data-reader-theme`, the same attributes `ui-reader` takes), so it needs no inline colours. A
 * `radiogroup` of native radios: arrows move and select, Tab enters the checked tile, each tile is
 * named by its `label`. The checked tile has a 2px `text` ring with a 2px `surface` gap. Name the
 * group with `ariaLabel` or `ariaLabelledby`; bind `[(value)]` (the theme shown, the app's when
 * the person has not chosen one).
 */
@Component({
  selector: 'ui-reader-theme-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-reader-theme-picker',
    role: 'radiogroup',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './reader-theme-picker.component.html',
  styleUrl: './reader-theme-picker.component.scss',
})
export class ReaderThemePickerComponent implements FormValueControl<string> {
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The checked theme (a `READER_THEME` value); empty when none is checked. */
  readonly value = model('');
  readonly options = input.required<readonly ReaderThemeOption[]>();
  /** Form field name; the native radios share it. Generated when empty. */
  readonly name = input('');
  readonly ariaLabel = input('');
  readonly ariaLabelledby = input('');
  /** Emits when focus leaves the group. */
  readonly touch = output<void>();

  protected readonly groupId = nextFieldId('ui-reader-theme');

  /** Focuses the checked tile, or the first one. */
  focus(options?: FocusOptions): void {
    const radio =
      this.host.querySelector<HTMLInputElement>('input:checked') ??
      this.host.querySelector<HTMLInputElement>('input');
    radio?.focus(options);
  }

  /** The app theme whose tokens draw the tile. */
  protected base(theme: ReaderTheme): string {
    return theme === READER_THEME.Light || theme === READER_THEME.Sepia ? THEME.Light : THEME.Dark;
  }

  protected select(option: ReaderThemeOption): void {
    this.value.set(option.value);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !this.host.contains(event.relatedTarget)) {
      this.touch.emit();
    }
  }
}
