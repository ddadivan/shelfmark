import type { RuleMatch } from '@shelfmark/contracts';
import type { RuleUndoGroup } from '../models/rule-undo-group.interface';

/**
 * How to undo "Apply to existing links": the matched links grouped by the rule tags each one did
 * not have before (compared ignoring case, like the API). Links that had them all form a group
 * with no tags to remove (they are only moved back).
 */
export function ruleUndoGroups(
  matches: readonly RuleMatch[],
  ruleTags: readonly string[],
): RuleUndoGroup[] {
  const groups = new Map<string, RuleUndoGroup>();
  for (const match of matches) {
    const had = new Set(match.tags.map((tag) => tag.toLowerCase()));
    const added = ruleTags.filter((tag) => !had.has(tag.toLowerCase()));
    const key = JSON.stringify(added);
    const group = groups.get(key) ?? { ids: [], removeTags: added };
    group.ids.push(match.id);
    groups.set(key, group);
  }
  return [...groups.values()];
}
