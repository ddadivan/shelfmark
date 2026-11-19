import type { NEW_VIEW_COMPOSE } from './new-view-compose.const';

/** One of `NEW_VIEW_COMPOSE`. */
export type NewViewCompose = (typeof NEW_VIEW_COMPOSE)[keyof typeof NEW_VIEW_COMPOSE];
