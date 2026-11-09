import type { ScaleToken } from './scale-token.interface';

export const SHADOW_TOKENS: readonly ScaleToken[] = [
  { name: 'shadow-card-hover', value: 'cards on hover (spreads from under the card)' },
  { name: 'shadow-card-spread', value: 'ui-card hover: spreads from under the card, never lifts' },
  {
    name: 'shadow-card-pointer',
    value: 'ui-card hover: the layer that leans away from the pointer (uiPointerShadow)',
  },
  { name: 'shadow-card-press', value: 'ui-card pressed: the spread tightens (80 ms)' },
  { name: 'shadow-popover', value: 'menus, dialogs, toasts, tooltips' },
];
