import { linkHost } from '../links/link-host';
import { stripWww } from '../links/strip-www';
import { withDefaultScheme } from '../links/with-default-scheme';
import { RULE_LIMIT } from './rule-limit.const';

/**
 * A domain name after the URL parser: dotted labels of `a-z`, digits and `-` (IDN arrives in
 * punycode), ending in a letter-only top-level label or a punycode one. IP addresses and single
 * labels (`localhost`) do not match.
 */
const RULE_DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[a-z]{2,}|xn--[a-z0-9-]+)$/;

/** `http:` and `https:` only: the rest has no host worth a rule. */
const HTTP_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/**
 * The host the URL parser reads from `url`: lower case, IDN as punycode, one trailing dot and a
 * leading `www.` dropped; `null` for anything that is not an http(s) URL. Shared by rule matching
 * and the stored domain, so `WWW.YouTube.com.` and `youtube.com` are the same.
 */
export function ruleHost(url: string): string | null {
  const scheme = url.trimStart().toLowerCase();
  if (!HTTP_PROTOCOLS.some((protocol) => scheme.startsWith(`${protocol}//`))) {
    return null;
  }
  const host = linkHost(url);
  return host === null || host === '' ? null : stripWww(host);
}

/**
 * The domain a rule stores for what the user typed or pasted (#398): `youtube.com`,
 * `WWW.YouTube.com`, `https://m.youtube.com/watch?v=1` and `bücher.de` become `youtube.com`,
 * `youtube.com`, `m.youtube.com` and `xn--bcher-kva.de`. `null` when there is no domain name in it
 * (empty, a single label, an IP address, another scheme, too long). Pure; used by the API DTO and
 * the web form alike.
 */
export function normalizeRuleDomain(input: string): string | null {
  const text = input.trim();
  if (text === '' || text.length > RULE_LIMIT.DomainInputMax) return null;
  const host = ruleHost(withDefaultScheme(text));
  if (host === null || host.length > RULE_LIMIT.DomainMax || !RULE_DOMAIN.test(host)) return null;
  return host;
}
