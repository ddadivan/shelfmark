import { CSP_NONCE_PLACEHOLDER } from './models/csp-nonce-placeholder.const';

/** Replaces every nonce placeholder in the shell. The nonce is base64, safe inside an attribute. */
export function injectNonce(html: string, nonce: string): string {
  return html.replaceAll(CSP_NONCE_PLACEHOLDER, nonce);
}
