import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { UI_FOCUS_TARGET } from '../../directives/focus-target/models/ui-focus-target.const';
import type { UiFocusTarget } from '../../directives/focus-target/models/ui-focus-target.interface';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * The Ask button at the top right of every page (Shelf, AskButton): a 40px pill on
 * `surface-hover` with the spark and a label ("Ask"). On hover and keyboard focus a soft
 * four-colour glow fades in behind the label (600 ms) and turns slowly (9 s a turn); under
 * reduced motion it appears without turning. The glow is the one decorative moment of the
 * interface and is never reused. `shortcut` ("Ctrl J") shows as a tooltip hint.
 * Wraps a native `<button>`; `activated` fires on click, Enter and Space.
 */
@Component({
  selector: 'ui-ask-button',
  imports: [IconComponent, TooltipDirective],
  providers: [{ provide: UI_FOCUS_TARGET, useExisting: AskButtonComponent }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-button.component.html',
  styleUrl: './ask-button.component.scss',
})
export class AskButtonComponent implements UiFocusTarget {
  /** Visible text; the feature passes the translated "Ask". */
  readonly label = input.required<string>();
  /** Keyboard shortcut shown in the tooltip, for example "Ctrl J". */
  readonly shortcut = input('');
  /** Tooltip text; defaults to the label when a shortcut is set. */
  readonly tooltip = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** `aria-expanded` of the inner button, when it toggles a panel. */
  readonly ariaExpanded = input<boolean>();

  /** Fires when the button is activated (click, Enter, Space). */
  readonly activated = output<void>();

  private readonly control = viewChild<ElementRef<HTMLButtonElement>>('control');
  /** The inner native `<button>`; `undefined` until rendered. */
  readonly element = computed(() => this.control()?.nativeElement);

  protected readonly iconSize = ICON_SIZE.Sm;
  protected readonly tooltipText = computed(
    () => this.tooltip() || (this.shortcut() ? this.label() : ''),
  );

  /** Focuses the inner native element (not the non-focusable host). */
  focus(options?: FocusOptions): void {
    this.element()?.focus(options);
  }
}
