import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TooltipPosition } from './models/tooltip-position.type';
import { OVERLAY_SIDE } from '../overlay/models/overlay-side.const';

/**
 * The floating part of `uiTooltip`, rendered into a CDK overlay by the directive. It is not
 * public API. `open` drives `@if`, so `animate.enter` / `animate.leave` play; the directive
 * detaches the overlay after the leave animation. The panel is `aria-hidden`: assistive
 * technology gets the text through `aria-describedby` on the trigger, so it is not read twice.
 */
@Component({
  selector: 'ui-tooltip-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tooltip-panel.component.html',
  styleUrl: './tooltip-panel.component.scss',
})
export class TooltipPanelComponent {
  readonly text = input('');
  readonly shortcut = input('');
  /** The side the tooltip really sits on (after a flip); decides which edge keeps the gap. */
  readonly side = input<TooltipPosition>(OVERLAY_SIDE.Bottom);
  readonly open = input(true);
  /** The pointer entered or left the tooltip (WCAG 1.4.13: it stays open while hovered). */
  readonly hovered = output<boolean>();
}
