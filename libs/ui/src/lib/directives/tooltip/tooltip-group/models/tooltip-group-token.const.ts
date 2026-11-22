import { InjectionToken } from '@angular/core';
import type { TooltipGroupState } from '../tooltip-group-state';

/** Provided by `uiTooltipGroup`; a tooltip outside a group finds none. */
export const TOOLTIP_GROUP = new InjectionToken<TooltipGroupState>('TOOLTIP_GROUP');
