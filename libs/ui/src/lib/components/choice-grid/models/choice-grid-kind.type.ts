import type { CHOICE_GRID_KIND } from './choice-grid-kind.const';

/** One of `CHOICE_GRID_KIND`. */
export type ChoiceGridKind = (typeof CHOICE_GRID_KIND)[keyof typeof CHOICE_GRID_KIND];
