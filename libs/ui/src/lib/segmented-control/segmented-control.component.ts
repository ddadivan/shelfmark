import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  model,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { nextFieldId } from '../field/field-ids';
import { IconComponent } from '../icon/icon.component';
import { RippleDirective } from '../ripple/ripple.directive';
import { TooltipDirective } from '../tooltip/tooltip.directive';
import type { SegmentedOption } from './models/segmented-option.interface';
import { ICON_SIZE } from '../icon/models/icon-size.const';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

/**
 * Switches between 2 to 4 views (cards and list, a theme). Icon and/or label per option;
 * `iconOnly` shows just the icons (every option then needs an icon and a `label`, which becomes
 * its accessible name and tooltip). The choice is the `value` model, so `[formField]` binds it.
 *
 * ARIA pattern: a `radiogroup` of native `<input type="radio">`, the same as `ui-radio-group`.
 * A view switch is a single choice, and native radios give exactly the pattern for free: Tab
 * enters the checked option, the arrow keys move and select (wrapping), disabled options are
 * skipped. Angular Aria 22 has no radio group, and its toolbar would announce toggle buttons
 * (`aria-pressed`) rather than one choice, so it is not used.
 *
 * The white thumb slides to the selected option (200 ms, `ease-out`; it jumps under reduced
 * motion); options share one width. Name the group with `ariaLabel` or `ariaLabelledby`.
 */
@Component({
  selector: 'ui-segmented-control',
  imports: [IconComponent, RippleDirective, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-seg',
    '[class.ui-seg--none]': 'selectedIndex() < 0',
    '[class.ui-seg--disabled]': 'disabled()',
    '[style.--seg-n]': 'options().length',
    '[style.--seg-i]': 'selectedIndex()',
    role: 'radiogroup',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '(focusout)': 'onFocusOut($event)',
  },
  templateUrl: './segmented-control.component.html',
  styleUrl: './segmented-control.component.scss',
})
export class SegmentedControlComponent implements FormValueControl<string> {
  protected readonly ICON_SIZE = ICON_SIZE;
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Value of the selected option; empty when none is selected. */
  readonly value = model('');
  /** 2 to 4 options; values are unique. */
  readonly options = input.required<readonly SegmentedOption[]>();
  /** Only icons are shown; each option's `label` is then its name and tooltip. */
  readonly iconOnly = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Form field name; the native radios share it. Generated when empty. */
  readonly name = input('');
  /** Accessible name of the group, for example "View". */
  readonly ariaLabel = input('');
  /** Id of the element that names the group. */
  readonly ariaLabelledby = input('');
  /** Emits when focus leaves the group; `[formField]` marks the field touched. */
  readonly touch = output<void>();

  protected readonly groupId = nextFieldId('ui-seg');
  protected readonly selectedIndex = computed(() =>
    this.options().findIndex((option) => option.value === this.value()),
  );

  constructor() {
    // Developer-error guards, dev mode only: production never throws over a missing label.
    if (isDevMode()) {
      effect(() => {
        const count = this.options().length;
        if (count < MIN_OPTIONS || count > MAX_OPTIONS) {
          throw new Error(`ui-segmented-control: needs ${MIN_OPTIONS} to ${MAX_OPTIONS} options.`);
        }
        if (this.iconOnly() && this.options().some((option) => !option.icon)) {
          throw new Error('ui-segmented-control: iconOnly needs an icon on every option.');
        }
      });
    }
  }

  /** Focuses the checked radio, or the first enabled one when none is checked. */
  focus(options?: FocusOptions): void {
    const radio =
      this.host.querySelector<HTMLInputElement>('input:checked') ??
      this.host.querySelector<HTMLInputElement>('input:enabled');
    radio?.focus(options);
  }

  protected select(option: SegmentedOption): void {
    this.value.set(option.value);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !this.host.contains(event.relatedTarget)) {
      this.touch.emit();
    }
  }
}
