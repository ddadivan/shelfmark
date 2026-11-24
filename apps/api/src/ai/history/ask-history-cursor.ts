import type { AskHistoryCursor } from '../models/ask-history-cursor.interface';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURSOR_MAX = 120;

/** The list's keyset cursor: base64url of `<updatedAt ISO>|<id>`. */
export function encodeAskHistoryCursor(cursor: AskHistoryCursor): string {
  return Buffer.from(`${cursor.updatedAt.toISOString()}|${cursor.id}`, 'utf8').toString(
    'base64url',
  );
}

/** Reads a cursor back; `null` for anything malformed. */
export function decodeAskHistoryCursor(value: string): AskHistoryCursor | null {
  if (value.length === 0 || value.length > CURSOR_MAX || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }
  const [time, id, extra] = Buffer.from(value, 'base64url').toString('utf8').split('|');
  if (time === undefined || id === undefined || extra !== undefined || !UUID.test(id)) return null;
  const updatedAt = new Date(time);
  if (Number.isNaN(updatedAt.getTime()) || updatedAt.toISOString() !== time) return null;
  return { updatedAt, id };
}
