import { HttpStatus, Injectable } from '@nestjs/common';
import { McpDispatcher } from './json-rpc/dispatch';
import { parseMessage } from './json-rpc/parse-message';
import { JSON_RPC_MESSAGE_KIND } from './models/json-rpc-message-kind.const';
import type { McpHttpAnswer } from './models/mcp-http-answer.interface';
import type { McpPrincipal } from './models/mcp-principal.interface';

/**
 * The stateless Streamable HTTP subset of ADR 0053: one JSON-RPC message per POST, answered with
 * `application/json` (200) or, for notifications and client responses, 202 without a body.
 */
@Injectable()
export class McpServerService {
  constructor(private readonly dispatcher: McpDispatcher) {}

  async handle(raw: unknown, principal: McpPrincipal): Promise<McpHttpAnswer> {
    const message = parseMessage(typeof raw === 'string' ? raw : '');
    switch (message.kind) {
      case JSON_RPC_MESSAGE_KIND.Invalid:
        return { status: HttpStatus.OK, body: message.response };
      case JSON_RPC_MESSAGE_KIND.Notification:
      case JSON_RPC_MESSAGE_KIND.Response:
        return { status: HttpStatus.ACCEPTED, body: null };
      case JSON_RPC_MESSAGE_KIND.Request:
        return {
          status: HttpStatus.OK,
          body: await this.dispatcher.dispatch(message.request, principal),
        };
    }
  }
}
