import { UI_VIEW } from './models/ui-view.const';
import type { UiView } from './models/ui-view.type';

export function isUiView(value: unknown): value is UiView {
  return Object.values(UI_VIEW).some((view) => view === value);
}
