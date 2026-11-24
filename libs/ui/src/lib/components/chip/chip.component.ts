import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { RippleDirective } from '../../directives/ripple/ripple.directive';
import type { ChipVariant } from './models/chip-variant.type';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { CHIP_VARIANT } from './models/chip-variant.const';
import { TRUNCATION_EPSILON_PX } from './models/truncation-epsilon-px.const';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { UI_FOCUS_TARGET } from '../../directives/focus-target/models/ui-focus-target.const';
import type { UiFocusTarget } from '../../directives/focus-target/models/ui-focus-target.interface';

/**
 * Tag or state chip. `variant="tag"` is sage (`accent-bg` / `accent-text`), `neutral` is for
 * filters, states and the "+2" overflow chip. The label is projected content.
 * `clickable` renders the body as a native `<button>` (ripple, `clicked`); otherwise it is
 * plain text with no ripple. `removable` adds a separate remove button named by `removeLabel`
 * (a translated string such as "Remove tag design"); Delete or Backspace on a focused
 * removable chip emits `removed` too.
 *
 * `truncate` lets the chip shrink below its text: the label ends in an ellipsis inside the pill
 * (never cut by the container), up to `--ui-chip-max-inline-size` (default the full width).
 * `UI_FOCUS_TARGET` is the clickable body (else the host), so a tooltip or a popover trigger on
 * `<ui-chip>` anchors on, and writes its ARIA state to, the element that has focus.
 */
@Component({
  selector: 'ui-chip',
  imports: [TooltipDirective, NgTemplateOutlet, IconComponent, RippleDirective],
  providers: [{ provide: UI_FOCUS_TARGET, useExisting: ChipComponent }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-chip',
    '[class.ui-chip--tag]': 'variant() === CHIP_VARIANT.Tag',
    '[class.ui-chip--neutral]': 'variant() === CHIP_VARIANT.Neutral',
    '[class.ui-chip--nav]': 'variant() === CHIP_VARIANT.Nav',
    '[class.ui-chip--hashtag]': 'variant() === CHIP_VARIANT.Hashtag',
    '[class.ui-chip--filter]': 'variant() === CHIP_VARIANT.Filter',
    '[class.ui-chip--jump]': 'variant() === CHIP_VARIANT.Jump',
    '[class.ui-chip--pressed]': 'pressed() === true',
    '[class.ui-chip--clickable]': 'clickable()',
    '[class.ui-chip--removable]': 'removable()',
    '[class.ui-chip--menu]': 'hasMenu()',
    '[class.ui-chip--disabled]': 'disabled()',
    '[class.ui-chip--truncate]': 'truncate()',
    '(keydown)': 'onKeydown($event)',
  },
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
})
export class ChipComponent implements UiFocusTarget {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly CHIP_VARIANT = CHIP_VARIANT;

  /** `tag` (sage) or `neutral`. */
  readonly variant = input<ChipVariant>(CHIP_VARIANT.Tag);
  /** Renders the body as a button (ripple, `clicked`). */
  readonly clickable = input(false, { transform: booleanAttribute });
  /** Adds a remove button and Delete / Backspace removal. */
  readonly removable = input(false, { transform: booleanAttribute });
  /** Disables the clickable body and the removal. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The label may shrink and end in an ellipsis (max width: `--ui-chip-max-inline-size`). */
  readonly truncate = input(false, { transform: booleanAttribute });
  /** Optional leading icon. */
  readonly icon = input<IconName>();
  /**
   * A clickable chip that toggles (a filter option): `aria-pressed` on its button. Unset (the
   * default) leaves it a plain button.
   */
  readonly pressed = input<boolean>();
  /**
   * Accessible name of the clickable body when its text alone says too little (a "+3" chip:
   * "3 more tags: a, b, c"). Without it the projected text names the button.
   */
  readonly ariaLabel = input<string>();
  /** Accessible name of the remove button; required in practice when `removable`. */
  readonly removeLabel = input<string>();

  /**
   * Accessible name of the optional trailing "..." button ("Actions for tag design"). The
   * button is rendered only when this is non-empty, so there is never a nameless button.
   */
  readonly menuLabel = input<string>();

  /**
   * The "..." button was pressed. Carries the button element as the origin for
   * `ui-menu.openFrom(origin)`; the chip's own action (`clicked`) is not triggered, and
   * Delete / Backspace on the focused menu button never remove the chip.
   */
  readonly menuRequested = output<HTMLElement>();

  /** The clickable body was activated (click, Enter, Space). */
  readonly clicked = output<void>();
  /** The chip should be removed (remove button, Delete, Backspace). */
  readonly removed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly bodyButton = viewChild<ElementRef<HTMLButtonElement>>('bodyButton');

  protected readonly hasMenu = computed(() => !!this.menuLabel());

  /** The focusable body of a clickable chip, else the host (`UI_FOCUS_TARGET`). */
  readonly element = computed<HTMLElement | undefined>(() =>
    this.clickable() ? this.bodyButton()?.nativeElement : this.host,
  );

  /**
   * Focuses the clickable body, else the remove button. Does nothing for a plain chip
   * (no focusable part). Lets a TagInput move focus to a sibling after `removed`.
   */
  focus(options?: FocusOptions): void {
    this.host
      .querySelector<HTMLElement>(
        'button.ui-chip__body, button.ui-chip__menu, button.ui-chip__remove',
      )
      ?.focus(options);
  }

  /**
   * The label is cut with an ellipsis right now (`truncate`). `scrollWidth` and `clientWidth` are
   * whole pixels, so a text that overflows by less than one pixel reads as fitting while the
   * browser already draws "angul…"; the text's own width (a range over the label) against the
   * label box catches that sub-pixel case.
   */
  isTruncated(): boolean {
    const label = this.host.querySelector<HTMLElement>('.ui-chip__label');
    if (!label) return false;
    if (label.scrollWidth > label.clientWidth) return true;
    const range = document.createRange();
    range.selectNodeContents(label);
    if (typeof range.getBoundingClientRect !== 'function') return false;
    const overflow = range.getBoundingClientRect().width - label.getBoundingClientRect().width;
    return overflow > TRUNCATION_EPSILON_PX;
  }

  protected onMenuClick(event: MouseEvent, origin: HTMLElement): void {
    event.stopPropagation();
    this.menuRequested.emit(origin);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (
      this.removable() &&
      !this.disabled() &&
      !(event.target instanceof Element && event.target.closest('.ui-chip__menu')) &&
      (event.key === KEYBOARD_KEY.Delete || event.key === KEYBOARD_KEY.Backspace)
    ) {
      event.preventDefault();
      this.removed.emit();
    }
  }
}
