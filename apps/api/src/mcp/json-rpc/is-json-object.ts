import { isRecord } from '../../common/util/is-record';

/** A JSON object (not an array, not `null`). */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && !Array.isArray(value);
}
