import type { UiView } from './ui-view.type';

/** Layout and input preferences kept in `localStorage`. */
export interface UiState {
  view: UiView;
  /** Single-character shortcuts (the "?" key) are on; WCAG 2.1.4 lets people turn them off. */
  singleKeyShortcuts: boolean;
}
