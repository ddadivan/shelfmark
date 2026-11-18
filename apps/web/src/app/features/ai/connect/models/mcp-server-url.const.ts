import { DOCUMENT } from '@angular/common';
import { inject, InjectionToken } from '@angular/core';
import { MCP_ENDPOINT } from '@shelfmark/contracts';

/**
 * The address MCP clients connect to: this app's origin and `MCP_ENDPOINT.Server` (the API is
 * served under `/api` on the same origin as the app).
 */
export const MCP_SERVER_URL = new InjectionToken<string>('MCP_SERVER_URL', {
  providedIn: 'root',
  factory: () => `${inject(DOCUMENT).location?.origin ?? ''}${MCP_ENDPOINT.Server}`,
});
