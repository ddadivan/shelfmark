/** JSON-RPC 2.0 error codes the MCP handler answers. */
export const JSON_RPC_ERROR_CODE = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;
