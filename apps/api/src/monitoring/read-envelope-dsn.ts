import { parseDsn } from './parse-dsn';
import type { ParsedDsn } from './models/parsed-dsn.interface';

/**
 * Reads the DSN from the first line of a Sentry envelope (a JSON header).
 * Returns `undefined` when the header is missing, malformed or has no valid DSN.
 */
export function readEnvelopeDsn(envelope: Buffer): ParsedDsn | undefined {
  const newline = envelope.indexOf(0x0a);
  const headerBytes = newline === -1 ? envelope : envelope.subarray(0, newline);
  let header: unknown;
  try {
    header = JSON.parse(headerBytes.toString('utf8'));
  } catch {
    return undefined;
  }
  const dsn =
    typeof header === 'object' && header !== null ? Reflect.get(header, 'dsn') : undefined;
  return typeof dsn === 'string' ? parseDsn(dsn) : undefined;
}
