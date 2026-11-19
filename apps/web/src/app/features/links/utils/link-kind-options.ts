import { LINK_KIND } from '@shelfmark/contracts';
import type { SelectOption } from '@shelfmark/ui';
import { LINK_KIND_ICON } from '../models/link-kind-icon.const';

/**
 * The ten kinds as `ui-select` options in `LINK_KIND` order, each with its icon and its singular
 * label (`links.kindOption.*`, #537); `translate` is the caller's Transloco lookup.
 */
export function linkKindOptions(translate: (key: string) => string): SelectOption[] {
  return Object.values(LINK_KIND).map((kind) => ({
    id: kind,
    name: translate(`links.kindOption.${kind}`),
    icon: LINK_KIND_ICON[kind],
  }));
}
