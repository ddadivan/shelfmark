import type { LinkResponse } from '@shelfmark/contracts';
import type { ChoiceOption } from '@shelfmark/ui';
import { ownImageUrl } from '../../links/utils/link-view';
import { COVER_CHOICES_MAX } from '../models/cover-choices-max.const';
import type { CoverOptionLabels } from '../models/cover-option-labels.interface';

/**
 * The choices of the folder cover (#418): "No cover" first, then the links of the folder that have
 * a captured preview (each once, at most `COVER_CHOICES_MAX`), and the current cover when its link
 * is not among them. Empty (no "No cover" either) when there is nothing to choose and no cover.
 */
export function coverOptions(
  links: readonly LinkResponse[],
  current: { id: string; url: string | null } | null,
  labels: CoverOptionLabels,
): ChoiceOption[] {
  const seen = new Set<string>();
  const pictures: ChoiceOption[] = [];
  for (const link of links) {
    const image = ownImageUrl(link.imageUrl);
    if (image === undefined || seen.has(link.id) || pictures.length >= COVER_CHOICES_MAX) {
      continue;
    }
    seen.add(link.id);
    pictures.push({ value: link.id, label: labels.option(link.title), image });
  }
  if (current && !seen.has(current.id)) {
    const image = ownImageUrl(current.url);
    pictures.unshift({ value: current.id, label: labels.current, ...(image && { image }) });
  }
  return pictures.length === 0
    ? []
    : [{ value: '', label: labels.none, icon: 'close' }, ...pictures];
}
