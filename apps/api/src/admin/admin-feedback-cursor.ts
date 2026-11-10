import { BadRequestException } from '@nestjs/common';
import { isRecord } from '../common/util/is-record';
import type { AdminFeedbackCursor } from './models/admin-feedback-cursor.interface';

const VERSION = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor text: base64url of the JSON `{v, t, id}` of the last row of a page. */
export function encodeAdminFeedbackCursor(row: { createdAt: Date; id: string }): string {
  const cursor: AdminFeedbackCursor = { v: VERSION, t: row.createdAt.toISOString(), id: row.id };
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

/** Decodes a cursor; malformed text is a 400. */
export function decodeAdminFeedbackCursor(raw: string): AdminFeedbackCursor {
  const invalid = new BadRequestException('Invalid cursor');
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalid;
  }
  if (!isRecord(parsed)) throw invalid;
  const { v, t, id } = parsed;
  if (v !== VERSION || typeof t !== 'string' || typeof id !== 'string' || !UUID.test(id)) {
    throw invalid;
  }
  const time = new Date(t);
  if (Number.isNaN(time.getTime()) || time.toISOString() !== t) throw invalid;
  return { v, t, id };
}
