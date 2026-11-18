import { MCP_TOKEN_PREFIX } from '@shelfmark/contracts';

/** Characters shown at each end of the random part. */
const VISIBLE = 4;

/**
 * A personal token as the shown-once view prints it: the prefix, the first and last four
 * characters of the random part, an ellipsis between (`smk_live_7Qh2…aX9c`). The Copy button
 * copies the whole value.
 */
export function maskSecret(secret: string): string {
  const prefix = secret.startsWith(MCP_TOKEN_PREFIX) ? MCP_TOKEN_PREFIX : '';
  const rest = secret.slice(prefix.length);
  if (rest.length <= VISIBLE * 2) return `${prefix}…`;
  return `${prefix}${rest.slice(0, VISIBLE)}…${rest.slice(-VISIBLE)}`;
}
