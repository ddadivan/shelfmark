import { VIEW_DRAFT_LIMIT } from '@shelfmark/contracts';
import type { ViewIdea } from '../models/view-idea.interface';
import type { ViewIdeasSource } from '../models/view-ideas-source.interface';

/**
 * The idea chips of the phrase step: the biggest tags and folders of the user by link count (empty
 * ones left out, a name that is both a tag and a folder once), at most `VIEW_DRAFT_LIMIT.IdeasMax`.
 */
export function viewIdeas(
  tags: readonly ViewIdeasSource[],
  folders: readonly ViewIdeasSource[],
): ViewIdea[] {
  const seen = new Set<string>();
  const ideas: ViewIdea[] = [];
  const sorted = [...tags, ...folders]
    .filter((source) => source.linkCount > 0 && source.name.trim() !== '')
    .sort((a, b) => b.linkCount - a.linkCount || a.name.localeCompare(b.name));
  for (const source of sorted) {
    const key = source.name.toLowerCase();
    if (!seen.has(key) && ideas.length < VIEW_DRAFT_LIMIT.IdeasMax) {
      seen.add(key);
      ideas.push({ id: source.id, name: source.name });
    }
  }
  return ideas;
}
