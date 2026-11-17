/**
 * How a domain rule write ended (#398): done, the domain has a rule (409), the limit is reached
 * (409), the folder is gone (404), the rule itself is gone (404), or another failure.
 */
export const RULE_OUTCOME = {
  Done: 'done',
  Taken: 'taken',
  Limit: 'limit',
  MissingFolder: 'missing-folder',
  Missing: 'missing',
  Failed: 'failed',
} as const;
