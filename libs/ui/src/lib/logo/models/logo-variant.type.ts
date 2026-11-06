import type { LOGO_VARIANT } from './logo-variant.const';

/** `lockup` is the mark with the wordmark, `mark` is the card with the bookmark alone. */
export type LogoVariant = (typeof LOGO_VARIANT)[keyof typeof LOGO_VARIANT];
