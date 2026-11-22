import { Directive, inject } from '@angular/core';
import { TOOLTIP_GROUP } from './models/tooltip-group.token';
import { TooltipGroupState } from './tooltip-group-state';

/**
 * Groups the `uiTooltip`s inside a toolbar (docs/design/components/Motion, "Tooltip travel"):
 * once one has opened (after its normal delay), hovering or focusing a neighbour opens its
 * tooltip at once and the panel travels from the old place to the new one. A tooltip that closed
 * less than 300 ms ago keeps the group warm. Leaving the group closes the open tooltip instantly
 * (moving onto the tooltip panel itself does not leave it, so the panel stays hoverable). Under
 * reduced motion neighbours still open at once, without travel.
 */
@Directive({
  selector: '[uiTooltipGroup]',
  providers: [{ provide: TOOLTIP_GROUP, useFactory: () => new TooltipGroupState() }],
  host: { '(pointerleave)': 'onLeave($event)' },
})
export class TooltipGroupDirective {
  private readonly state = inject(TOOLTIP_GROUP);

  protected onLeave(event: PointerEvent): void {
    const to = event.relatedTarget;
    if (to instanceof Element && to.closest('.ui-tooltip-hit')) {
      return;
    }
    this.state.leave();
  }
}
