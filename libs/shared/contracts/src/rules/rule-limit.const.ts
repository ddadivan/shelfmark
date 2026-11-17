/**
 * Domain rule limits (#398): rules per user, tag names per rule and the length of a domain (a DNS
 * name is at most 253 characters; the input may be a pasted address, so it may be longer).
 */
export const RULE_LIMIT = {
  PerUserMax: 50,
  TagsMax: 5,
  DomainMax: 253,
  DomainInputMax: 2048,
} as const;
