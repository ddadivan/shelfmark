import { isRecord } from '../../common/util/is-record';
import { JSON_RPC_ERROR_CODE } from '../models/json-rpc-error-code.const';
import type { JsonRpcId } from '../models/json-rpc-id.type';
import { JSON_RPC_MESSAGE_KIND } from '../models/json-rpc-message-kind.const';
import type { ParsedMessage } from '../models/parsed-message.type';
import { jsonRpcError } from './errors';
import { isJsonObject } from './is-json-object';

const JSON_RPC_VERSION = '2.0';

function isId(value: unknown): value is JsonRpcId {
  return typeof value === 'string' || (typeof value === 'number' && Number.isSafeInteger(value));
}

function invalid(id: JsonRpcId | null, code: number, message: string): ParsedMessage {
  return { kind: JSON_RPC_MESSAGE_KIND.Invalid, response: jsonRpcError(id, code, message) };
}

/**
 * Narrows the raw body of `POST /api/mcp` to one JSON-RPC 2.0 message. Unparseable JSON is `-32700`
 * with `id: null`; a batch (array) and anything that is not a request, notification or response is
 * `-32600` (with the id when it could be read); params that are present but not an object are
 * `-32602`. Nothing of the input is echoed in an error message.
 */
export function parseMessage(raw: string): ParsedMessage {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return invalid(null, JSON_RPC_ERROR_CODE.ParseError, 'Parse error');
  }
  if (Array.isArray(value)) {
    return invalid(null, JSON_RPC_ERROR_CODE.InvalidRequest, 'Batches are not supported');
  }
  if (!isRecord(value)) {
    return invalid(null, JSON_RPC_ERROR_CODE.InvalidRequest, 'Invalid request');
  }
  const hasId = 'id' in value;
  const id = isId(value['id']) ? value['id'] : null;
  if (value['jsonrpc'] !== JSON_RPC_VERSION || (hasId && id === null)) {
    return invalid(id, JSON_RPC_ERROR_CODE.InvalidRequest, 'Invalid request');
  }
  const method = value['method'];
  if (typeof method !== 'string') {
    // A client's answer to a server request (`result` or `error` with the id).
    if (id !== null && ('result' in value || 'error' in value)) {
      return { kind: JSON_RPC_MESSAGE_KIND.Response };
    }
    return invalid(id, JSON_RPC_ERROR_CODE.InvalidRequest, 'Invalid request');
  }
  const params = value['params'];
  if (params !== undefined && !isJsonObject(params)) {
    return invalid(id, JSON_RPC_ERROR_CODE.InvalidParams, 'Invalid params');
  }
  if (id === null) return { kind: JSON_RPC_MESSAGE_KIND.Notification, method };
  return { kind: JSON_RPC_MESSAGE_KIND.Request, request: { id, method, params: params ?? {} } };
}
