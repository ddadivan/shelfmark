import type { BrowserBrand } from './browser-brand.interface';

/**
 * What the extension check reads from `navigator`: the user-agent string and, where the browser
 * has it (Chromium only), `userAgentData`. Typed here because not every TypeScript DOM lib
 * declares User-Agent Client Hints.
 */
export interface BrowserIdentity {
  readonly userAgent: string;
  readonly userAgentData?: {
    readonly brands: readonly BrowserBrand[];
    readonly mobile: boolean;
    readonly platform: string;
  };
}
