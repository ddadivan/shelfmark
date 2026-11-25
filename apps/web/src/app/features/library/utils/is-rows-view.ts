import { UI_VIEW } from '../../../stores/models/ui-view.const';
import type { UiView } from '../../../stores/models/ui-view.type';

/** The List and Headlines views show links as rows (no Grid size, no card previews). */
export function isRowsView(view: UiView): boolean {
  return view === UI_VIEW.List || view === UI_VIEW.Headlines;
}
