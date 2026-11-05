import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  input,
  isDevMode,
  output,
  viewChild,
} from '@angular/core';
import { UI_FOCUS_TARGET } from '../focus-target/ui-focus-target.const';
import type { UiFocusTarget } from '../focus-target/models/ui-focus-target.interface';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { RippleDirective } from '../ripple/ripple.directive';
import type { ButtonHaspopup } from './models/button-haspopup.type';
import type { ButtonPressed } from './models/button-pressed.type';
import type { ButtonSize } from './models/button-size.type';
import type { ButtonType } from './models/button-type.type';
import type { ButtonVariant } from './models/button-variant.type';

/**
 * Triggers an action. Wraps a native `<button>`, so keyboard, focus and form behaviour are
 * the browser's; with `href` it wraps an `<a>` instead (same look, `linkClick` output for
 * routing). Content is the label text. `iconOnly` shows just an icon and requires
 * `ariaLabel`; in dev mode a missing one throws.
 *
 * Trigger API: the ARIA inputs land on the inner element, `focus()` / `element` expose it and
 * `UI_FOCUS_TARGET` lets directives on `<ui-button>` (tooltip, menu trigger) reach it.
 * A ripple plays from the touch point on the inner element (`ripple` opts out).
 */
@Component({
  selector: 'ui-button',
  imports: [IconComponent, NgTemplateOutlet, RippleDirective],
  providers: [{ provide: UI_FOCUS_TARGET, useExisting: forwardRef(() => ButtonComponent) }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent implements UiFocusTarget {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly iconLeft = input<IconName>();
  readonly iconRight = input<IconName>();
  /** Shows only an icon (`iconLeft`, else `iconRight`). Requires `ariaLabel`. */
  readonly iconOnly = input(false, { transform: booleanAttribute });
  /** Accessible name; required for icon-only buttons. */
  readonly ariaLabel = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Renders an inner `<a href>` instead of a `<button>` (`type` then does not apply). */
  readonly href = input<string>();
  /** Press ripple; `[ripple]="false"` opts out. */
  readonly ripple = input(true, { transform: booleanAttribute });
  /** `aria-expanded` of the inner element; unset renders no attribute. */
  readonly ariaExpanded = input<boolean>();
  readonly ariaControls = input<string>();
  readonly ariaHaspopup = input<ButtonHaspopup>();
  readonly ariaDescribedby = input<string>();
  readonly ariaPressed = input<ButtonPressed>();

  /**
   * Plain left click on the link (no modifier key). Call `preventDefault()` on the event to
   * route instead of navigating; middle and Cmd/Ctrl-click keep native behaviour.
   */
  readonly linkClick = output<MouseEvent>();

  private readonly control = viewChild<ElementRef<HTMLElement>>('control');
  /** The inner native `<button>` / `<a>`; `undefined` until rendered. */
  readonly element = computed(() => this.control()?.nativeElement);

  protected readonly isLink = computed(() => this.href() !== undefined);
  protected readonly rippleActive = computed(() => this.ripple() && !this.disabled());
  protected readonly classes = computed(() => {
    const classes = ['ui-button', `ui-button--${this.variant()}`];
    if (this.size() !== 'md') {
      classes.push(`ui-button--${this.size()}`);
    }
    if (this.iconOnly()) {
      classes.push('ui-button--icon');
    }
    return classes.join(' ');
  });

  protected readonly iconSize = computed(() => (this.size() === 'lg' ? 20 : 16));
  protected readonly singleIcon = computed(() => this.iconLeft() ?? this.iconRight());

  constructor() {
    // Developer-error guard, dev mode only: production never throws over a missing label.
    if (isDevMode()) {
      effect(() => {
        if (this.iconOnly() && !this.ariaLabel()) {
          throw new Error('ui-button: iconOnly requires an ariaLabel.');
        }
      });
    }
  }

  /** Focuses the inner native element (not the non-focusable host). */
  focus(options?: FocusOptions): void {
    this.element()?.focus(options);
  }

  protected onLinkClick(event: MouseEvent): void {
    if (this.disabled()) {
      // A disabled link is inert: no navigation and no click for listeners on the host.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const plain =
      event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
    if (plain) {
      this.linkClick.emit(event);
    }
  }
}
