import { LINK_FRAMING, type LinkFraming } from '@shelfmark/contracts';
import type { FramingHeaders } from './models/framing-headers.interface';

const REFUSING_FRAME_OPTIONS = ['deny', 'sameorigin', 'allow-from'];
const FRAME_ANCESTORS = 'frame-ancestors';
/** The only `frame-ancestors` sources that let a page on any https origin frame the page. */
const ALLOWING_ANCESTORS = ['*', 'https:', 'https://*'];

function refusedByFrameOptions(value: string | null): boolean {
  if (value === null) return false;
  return value
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .some((token) => REFUSING_FRAME_OPTIONS.some((refusing) => token.startsWith(refusing)));
}

/** True when this one policy has a `frame-ancestors` directive that does not let us in. */
function policyRefuses(policy: string): boolean {
  for (const directive of policy.split(';')) {
    const [name, ...sources] = directive.trim().split(/\s+/);
    if (name?.toLowerCase() !== FRAME_ANCESTORS) continue;
    // Only the first `frame-ancestors` of a policy counts. No source at all is `'none'`.
    return !sources.some((source) => ALLOWING_ANCESTORS.includes(source.toLowerCase()));
  }
  return false;
}

function refusedByContentSecurityPolicy(value: string | null): boolean {
  if (value === null) return false;
  // Several policies arrive joined by a comma; each one applies, so one refusal is enough.
  return value.split(',').some(policyRefuses);
}

/**
 * Decides from the response headers of a page whether it may be shown in the preview frame (#553,
 * ADR 0059). Conservative: `X-Frame-Options` `DENY`, `SAMEORIGIN` or `ALLOW-FROM`, or a CSP
 * `frame-ancestors` that is not `*`, `https:` or `https://*`, is `blocked`; a host list or `'self'`
 * is blocked too, because Shelfmark's origin is not in any site's list.
 */
export function decideFraming(headers: FramingHeaders): LinkFraming {
  return refusedByFrameOptions(headers.xFrameOptions) ||
    refusedByContentSecurityPolicy(headers.contentSecurityPolicy)
    ? LINK_FRAMING.Blocked
    : LINK_FRAMING.Allowed;
}
