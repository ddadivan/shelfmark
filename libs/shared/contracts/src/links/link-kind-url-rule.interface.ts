import type { LinkKind } from './link-kind.type';

/** One URL rule of `LINK_KIND_URL_RULES` (#537). */
export interface LinkKindUrlRule {
  readonly kind: LinkKind;
  /** Hosts the rule applies to; a subdomain matches too (`www.`, `m.`, `gist.`). */
  readonly hosts: readonly string[];
  /** When set, the URL path (lower case, without query and hash) must match it as well. */
  readonly path?: RegExp;
}
