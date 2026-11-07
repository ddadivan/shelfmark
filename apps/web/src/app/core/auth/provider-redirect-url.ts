import type { AuthProvider } from '@shelfmark/contracts';
import { AUTH_PROVIDER_HOST } from './models/auth-provider-host.const';

const HTTPS = 'https:';

/**
 * Returns `value` when the browser may be sent there after `POST /sign-in/social`, otherwise
 * `null`: an `https` URL on the chosen provider's own host (no credentials, default port), or
 * this app's own origin. Never navigate to a URL that did not pass this check.
 */
export function providerRedirectUrl(
  value: unknown,
  provider: AuthProvider,
  appOrigin: string,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.origin === appOrigin) {
    return url.href;
  }
  const trusted =
    url.protocol === HTTPS &&
    url.hostname === AUTH_PROVIDER_HOST[provider] &&
    url.port === '' &&
    url.username === '' &&
    url.password === '';
  return trusted ? url.href : null;
}
