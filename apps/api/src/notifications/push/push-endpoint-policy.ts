import { NOTIFICATION_LIMIT } from '@shelfmark/contracts';
import { PUSH_SERVICE_HOST } from '../models/push-service-host.const';

/**
 * True when a subscription endpoint may be stored and pushed to: an `https:` URL of at most
 * `NOTIFICATION_LIMIT.EndpointMax` characters, without credentials, on the default port, whose host
 * is an allow-listed push service (`PUSH_SERVICE_HOST`). Checked on subscribe and again before each
 * send, so a row can never make the server call another host.
 */
export function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > NOTIFICATION_LIMIT.EndpointMax) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if ((PUSH_SERVICE_HOST.Exact as readonly string[]).includes(host)) {
    return true;
  }
  return PUSH_SERVICE_HOST.Suffix.some(
    (suffix) => host.endsWith(suffix) && host.length > suffix.length,
  );
}
