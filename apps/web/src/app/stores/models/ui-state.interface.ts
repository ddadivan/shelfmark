import type { UiView } from './ui-view.type';

/** Layout preferences kept in `localStorage`. */
export interface UiState {
  view: UiView;
  /** The "Recently opened" panel is shown (wide screens only). */
  recentVisible: boolean;
}
