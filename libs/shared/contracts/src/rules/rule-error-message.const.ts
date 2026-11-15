import { RULE_LIMIT } from './rule-limit.const';

/** Error messages of the domain rules API (#398). */
export const RULE_ERROR_MESSAGE = {
  NotFound: 'Rule not found',
  FolderNotFound: 'Folder not found',
  InvalidDomain: 'domain must be a domain name such as youtube.com',
  DomainTaken: 'A rule for this domain exists already',
  NothingToDo: 'A rule needs a folder or at least one tag',
  LimitReached: `At most ${RULE_LIMIT.PerUserMax} rules can be saved`,
} as const;
