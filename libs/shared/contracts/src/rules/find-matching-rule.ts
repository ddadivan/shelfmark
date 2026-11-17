import { ruleHost } from './normalize-rule-domain';
import type { RuleTarget } from './rule-target.interface';

/** True when `host` is `domain` itself or one of its subdomains. */
export function hostMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * The rule for a link (#398): the rule whose domain is the link's host or a parent of it; when
 * several match (`youtube.com` and `music.youtube.com`), the most specific (longest) domain wins.
 * `null` when none matches or the URL has no http(s) host. Pure; the API applies it on save and
 * the web shows the same suggestion before saving.
 */
export function findMatchingRule<T extends RuleTarget>(rules: readonly T[], url: string): T | null {
  const host = ruleHost(url);
  if (host === null) return null;
  let best: T | null = null;
  for (const rule of rules) {
    if (
      hostMatchesDomain(host, rule.domain) &&
      (best === null || rule.domain.length > best.domain.length)
    ) {
      best = rule;
    }
  }
  return best;
}
