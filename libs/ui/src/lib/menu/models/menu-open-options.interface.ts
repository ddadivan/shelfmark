import type { MenuFocusEdge } from './menu-focus-edge.type';

export interface MenuOpenOptions {
  /** Item that receives focus; `first` by default. */
  readonly focus?: MenuFocusEdge;
}
