import type { EasingToken } from './easing-token.interface';

/** Easing tokens with the job each one does (Motion principle 3). */
export const EASING_TOKENS: readonly EasingToken[] = [
  { name: 'out', use: 'appearing or reacting: menus, dialogs, toasts, press-down' },
  { name: 'in', use: 'only for things leaving the screen' },
  { name: 'in-out', use: 'things moving across the screen: cards in the feed, the tree' },
  { name: 'drawer', use: 'bottom sheets and the mobile menu' },
  { name: 'spring', use: 'small overshoot for small things: the landed card, the star' },
];
