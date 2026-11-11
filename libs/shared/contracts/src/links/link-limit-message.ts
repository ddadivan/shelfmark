import { LINK_ERROR_MESSAGE } from './link-error-message.const';

const FIT_PATTERN = /^Link limit reached: (\d+) more fit$/;

/** The 409 message of a batch that does not fit the per-user cap; it names how many links still fit. */
export function linkLimitMessage(fit: number): string {
  return `${LINK_ERROR_MESSAGE.LimitReached}: ${Math.max(0, Math.floor(fit))} more fit`;
}

/** How many links still fit, read from a `linkLimitMessage`; `null` for any other message. */
export function linkLimitFit(message: unknown): number | null {
  if (typeof message !== 'string') return null;
  const match = FIT_PATTERN.exec(message);
  return match ? Number(match[1]) : null;
}
