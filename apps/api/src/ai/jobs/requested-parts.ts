import { AI_FEATURE_MODE, type AiSettings } from '@shelfmark/contracts';
import { AI_PART } from '../models/ai-part.const';
import type { AiPart } from '../models/ai-part.type';

/**
 * The parts a job asks for (plan section 4, "Rules applied by the runner"): the folder unless its
 * mode is off or the save (the user or a domain rule) chose one, tags likewise, the summary while
 * summaries are on. Empty means no job at all.
 */
export function requestedParts(
  settings: AiSettings,
  filled: { folderSet: boolean; tagsSet: boolean },
): AiPart[] {
  const parts: AiPart[] = [];
  if (settings.tagsMode !== AI_FEATURE_MODE.Off && !filled.tagsSet) parts.push(AI_PART.Tags);
  if (settings.folderMode !== AI_FEATURE_MODE.Off && !filled.folderSet) parts.push(AI_PART.Folder);
  if (settings.summaries) parts.push(AI_PART.Summary);
  return parts;
}

const ALL_PARTS: readonly string[] = Object.values(AI_PART);

/** Narrows stored part names (a `text[]` column) to `AiPart`. */
export function toAiParts(values: readonly string[]): AiPart[] {
  return values.filter((value): value is AiPart => ALL_PARTS.includes(value));
}
