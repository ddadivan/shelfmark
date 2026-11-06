import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { RippleDirective } from '../ripple/ripple.directive';
import type { ChipVariant } from './models/chip-variant.type';
import { KEYBOARD_KEY } from '../keyboard';
import { CHIP_VARIANT } from './models/chip-variant.const';

/**
 * Tag or state chip. `variant="tag"` is sage (`accent-bg` / `accent-text`), `neutral` is for
 * filters, states and the "+2" overflow chip. The label is projected content.
 * `clickable` renders the body as a native `<button>` (ripple, `clicked`); otherwise it is
 * plain text with no ripple. `removable` adds a separate remove button named by `removeLabel`
 * (a translated string such as "Remove tag design"); Delete or Backspace on a focused
 * removable chip emits `removed` too.
 */
@Component({
  selector: 'ui-chip',
  imports: [NgTemplateOutlet, IconComponent, RippleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-chip',
    '[class.ui-chip--tag]': 'variant() === CHIP_VARIANT.Tag',
    '[class.ui-chip--neutral]': 'variant() === CHIP_VARIANT.Neutral',
    '[class.ui-chip--clickable]': 'clickable()',
    '[class.ui-chip--removable]': 'removable()',
    '[class.ui-chip--disabled]': 'disabled()',
    '(keydown)': 'onKeydown($event)',
  },
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
})
export class ChipComponent {
  protected readonly CHIP_VARIANT = CHIP_VARIANT;

  /** `tag` (sage) or `neutral`. */
  readonly variant = input<ChipVariant>(CHIP_VARIANT.Tag);
  /** Renders the body as a button (ripple, `clicked`). */
  readonly clickable = input(false, { transform: booleanAttribute });
  /** Adds a remove button and Delete / Backspace removal. */
  readonly removable = input(false, { transform: booleanAttribute });
  /** Disables the clickable body and the removal. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Optional leading icon. */
  readonly icon = input<IconName>();
  /** Accessible name of the remove button; required in practice when `removable`. */
  readonly removeLabel = input<string>();

  /** The clickable body was activated (click, Enter, Space). */
  readonly clicked = output<void>();
  /** The chip should be removed (remove button, Delete, Backspace). */
  readonly removed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Focuses the clickable body, else the remove button. Does nothing for a plain chip
   * (no focusable part). Lets a TagInput move focus to a sibling after `removed`.
   */
  focus(options?: FocusOptions): void {
    this.host
      .querySelector<HTMLElement>('button.ui-chip__body, button.ui-chip__remove')
      ?.focus(options);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (
      this.removable() &&
      !this.disabled() &&
      (event.key === KEYBOARD_KEY.Delete || event.key === KEYBOARD_KEY.Backspace)
    ) {
      event.preventDefault();
      this.removed.emit();
    }
  }
}
