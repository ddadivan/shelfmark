import type { JSON_RPC_MESSAGE_KIND } from './json-rpc-message-kind.const';
import type { JsonRpcRequest } from './json-rpc-request.interface';
import type { JsonRpcResponse } from './json-rpc-response.type';

/** The result of `parseMessage`. */
export type ParsedMessage =
  | { kind: typeof JSON_RPC_MESSAGE_KIND.Request; request: JsonRpcRequest }
  | { kind: typeof JSON_RPC_MESSAGE_KIND.Notification; method: string }
  | { kind: typeof JSON_RPC_MESSAGE_KIND.Response }
  | { kind: typeof JSON_RPC_MESSAGE_KIND.Invalid; response: JsonRpcResponse };
