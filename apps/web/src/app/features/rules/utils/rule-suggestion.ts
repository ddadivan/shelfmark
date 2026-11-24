import type { RuleResponse } from '@shelfmark/contracts';
import type { AppliedRule } from '../models/applied-rule.interface';
import type { RuleApplication } from '../models/rule-application.interface';
import type { RuleFields } from '../models/rule-fields.interface';
import type { RuleLocks } from '../models/rule-locks.interface';

const sameTag = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/**
 * Puts a rule into a save form (#398) the way the API would apply it, so the user sees it before
 * saving: its folder when the folder is not the user's choice, its tags when the user has not
 * chosen tags. Returns the new fields and what was applied.
 */
export function applyRule(
  fields: RuleFields,
  rule: RuleResponse,
  locks: RuleLocks,
): RuleApplication {
  const folderId =
    !locks.folder && locks.folderKnown && rule.folderAvailable && rule.folderId !== null
      ? rule.folderId
      : null;
  const tags = locks.tags
    ? []
    : rule.tags.filter((tag) => !fields.tags.some((current) => sameTag(current, tag)));
  return {
    fields: { folderId: folderId ?? fields.folderId, tags: [...fields.tags, ...tags] },
    applied: {
      ruleId: rule.id,
      domain: rule.domain,
      folderId,
      previousFolderId: fields.folderId,
      tags,
    },
  };
}

/**
 * Takes a rule out of a save form: the folder goes back when it is still the rule's, the rule's
 * tags leave; whatever the user changed since stays.
 */
export function revertRule(fields: RuleFields, applied: AppliedRule): RuleFields {
  return {
    folderId:
      applied.folderId !== null && fields.folderId === applied.folderId
        ? applied.previousFolderId
        : fields.folderId,
    tags: fields.tags.filter((tag) => !applied.tags.some((added) => sameTag(added, tag))),
  };
}

/**
 * What of the rule the form still shows: its folder while the form keeps it (a folder the user
 * picked afterwards wins, Shelf Add link's "Goes to" row comes after the address), the added tags
 * the form still has.
 */
export function stillInForm(applied: AppliedRule, fields: RuleFields): AppliedRule {
  return {
    ...applied,
    folderId:
      applied.folderId !== null && fields.folderId === applied.folderId ? applied.folderId : null,
    tags: applied.tags.filter((tag) => fields.tags.some((current) => sameTag(current, tag))),
  };
}

/** Whether the rule changed anything in the form (only then the chip shows). */
export function changedSomething(applied: AppliedRule | null): applied is AppliedRule {
  return applied !== null && (applied.folderId !== null || applied.tags.length > 0);
}
