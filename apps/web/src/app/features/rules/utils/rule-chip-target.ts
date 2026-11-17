import type { AppliedRule } from '../models/applied-rule.interface';

/** "Videos, #video": the folder name (when the rule set one) and the tags a rule applied. */
export function ruleChipTarget(applied: AppliedRule, folderName: (id: string) => string): string {
  const folder = applied.folderId === null ? '' : folderName(applied.folderId);
  return [folder, ...applied.tags.map((tag) => `#${tag}`)].filter((part) => part !== '').join(', ');
}
