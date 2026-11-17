import { Injectable, Logger } from '@nestjs/common';
import { JSON_RPC_ERROR_CODE } from '../models/json-rpc-error-code.const';
import type { JsonRpcRequest } from '../models/json-rpc-request.interface';
import type { JsonRpcResponse } from '../models/json-rpc-response.type';
import type { McpAnswered } from '../models/mcp-answered.interface';
import { MCP_METHOD } from '../models/mcp-method.const';
import type { McpPrincipal } from '../models/mcp-principal.interface';
import { MCP_SERVER_INFO } from '../models/mcp-server-info.const';
import { MCP_TOOL_CALL_KIND } from '../models/mcp-tool-call-kind.const';
import { McpToolRegistry } from '../tools/mcp-tool.registry';
import { jsonRpcError, jsonRpcResult } from './errors';
import { isJsonObject } from './is-json-object';
import { negotiateProtocolVersion } from './protocol-version';

const UNKNOWN_METHOD = 'unknown-method';
const UNKNOWN_TOOL = 'unknown-tool';
const TEXT_CONTENT = 'text';

/**
 * Answers one JSON-RPC request of the MCP server for the principal of the token: `initialize`
 * (version negotiation, capability `tools` only), `ping`, `tools/list`, `tools/call`; anything else
 * is `-32601`. A tool failure the assistant should see is a result with `isError: true`; an
 * unexpected error is `-32603` without details. Logs the method, tool name, outcome, duration and
 * item count only: never the token, the arguments or the results.
 */
@Injectable()
export class McpDispatcher {
  private readonly logger = new Logger('MCP');

  constructor(private readonly tools: McpToolRegistry) {}

  async dispatch(request: JsonRpcRequest, principal: McpPrincipal): Promise<JsonRpcResponse> {
    const startedAt = performance.now();
    let answered: McpAnswered;
    try {
      answered = await this.answer(request, principal);
    } catch (error) {
      this.logger.error(
        `${this.loggedMethod(request.method)} failed (${error instanceof Error ? error.name : 'unknown'})`,
      );
      answered = {
        response: jsonRpcError(request.id, JSON_RPC_ERROR_CODE.InternalError, 'Internal error'),
      };
    }
    const { response, tool, count } = answered;
    const parts = [
      this.loggedMethod(request.method),
      ...(tool === undefined ? [] : [tool]),
      'error' in response ? `error ${response.error.code}` : 'ok',
      `${Math.round(performance.now() - startedAt)}ms`,
      ...(count === undefined ? [] : [`items=${count}`]),
    ];
    this.logger.log(parts.join(' '));
    return response;
  }

  private async answer(request: JsonRpcRequest, principal: McpPrincipal): Promise<McpAnswered> {
    switch (request.method) {
      case MCP_METHOD.Initialize:
        return { response: jsonRpcResult(request.id, this.initialize(request.params)) };
      case MCP_METHOD.Ping:
        return { response: jsonRpcResult(request.id, {}) };
      case MCP_METHOD.ToolsList:
        return { response: jsonRpcResult(request.id, { tools: this.tools.definitions() }) };
      case MCP_METHOD.ToolsCall:
        return this.callTool(request, principal);
      default:
        return {
          response: jsonRpcError(
            request.id,
            JSON_RPC_ERROR_CODE.MethodNotFound,
            'Method not found',
          ),
        };
    }
  }

  private initialize(params: Record<string, unknown>): Record<string, unknown> {
    return {
      protocolVersion: negotiateProtocolVersion(params['protocolVersion']),
      capabilities: { tools: { listChanged: false } },
      serverInfo: {
        name: MCP_SERVER_INFO.Name,
        title: MCP_SERVER_INFO.Title,
        version: MCP_SERVER_INFO.Version,
      },
      instructions: MCP_SERVER_INFO.Instructions,
    };
  }

  private async callTool(request: JsonRpcRequest, principal: McpPrincipal): Promise<McpAnswered> {
    const name = request.params['name'];
    const args = request.params['arguments'] ?? {};
    if (typeof name !== 'string' || !isJsonObject(args)) {
      return {
        response: jsonRpcError(request.id, JSON_RPC_ERROR_CODE.InvalidParams, 'Invalid params'),
      };
    }
    const known = this.tools.definitions().some((definition) => definition.name === name);
    const tool = known ? name : UNKNOWN_TOOL;
    const call = await this.tools.call(name, principal, args);
    switch (call.kind) {
      case MCP_TOOL_CALL_KIND.Unknown:
        return {
          tool,
          response: jsonRpcError(request.id, JSON_RPC_ERROR_CODE.InvalidParams, 'Unknown tool'),
        };
      case MCP_TOOL_CALL_KIND.Invalid:
        return {
          tool,
          response: jsonRpcError(request.id, JSON_RPC_ERROR_CODE.InvalidParams, call.message),
        };
      case MCP_TOOL_CALL_KIND.Error:
        return {
          tool,
          response: jsonRpcResult(request.id, {
            content: [{ type: TEXT_CONTENT, text: call.message }],
            isError: true,
          }),
        };
      case MCP_TOOL_CALL_KIND.Ok:
        return {
          tool,
          count: call.count,
          response: jsonRpcResult(request.id, {
            content: [{ type: TEXT_CONTENT, text: JSON.stringify(call.structured) }],
            structuredContent: call.structured,
            isError: false,
          }),
        };
    }
  }

  /** A known method name, else a fixed placeholder (the method is client input). */
  private loggedMethod(method: string): string {
    return (Object.values(MCP_METHOD) as string[]).includes(method) ? method : UNKNOWN_METHOD;
  }
}
