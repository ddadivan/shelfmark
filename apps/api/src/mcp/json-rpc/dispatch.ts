import { Injectable, Logger } from '@nestjs/common';
import { JSON_RPC_ERROR_CODE } from '../models/json-rpc-error-code.const';
import type { JsonRpcRequest } from '../models/json-rpc-request.interface';
import type { JsonRpcResponse } from '../models/json-rpc-response.type';
import { MCP_METHOD } from '../models/mcp-method.const';
import { jsonRpcError, jsonRpcResult } from './errors';

/**
 * Answers one JSON-RPC request of the MCP server. Logs the method,
 * the outcome and the duration only: never the token, the arguments or the results.
 */
@Injectable()
export class McpDispatcher {
  private readonly logger = new Logger('MCP');

  async dispatch(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const startedAt = performance.now();
    const response = await this.answer(request);
    const outcome = 'error' in response ? `error ${response.error.code}` : 'ok';
    const duration = Math.round(performance.now() - startedAt);
    this.logger.log(`${this.loggedMethod(request.method)} ${outcome} ${duration}ms`);
    return response;
  }

  private answer(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    switch (request.method) {
      case MCP_METHOD.Ping:
        return Promise.resolve(jsonRpcResult(request.id, {}));
      default:
        return Promise.resolve(
          jsonRpcError(request.id, JSON_RPC_ERROR_CODE.MethodNotFound, 'Method not found'),
        );
    }
  }

  /** A known method name, else a fixed placeholder (the method is client input). */
  private loggedMethod(method: string): string {
    return (Object.values(MCP_METHOD) as string[]).includes(method) ? method : 'unknown-method';
  }
}
