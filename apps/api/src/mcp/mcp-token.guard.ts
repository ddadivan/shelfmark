import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MCP_ERROR_MESSAGE } from '@shelfmark/contracts';
import type { Response } from 'express';
import { RETRY_AFTER_HEADER } from '../common/rate-limit/models/retry-after-header.const';
import { isSupportedProtocolHeader } from './json-rpc/protocol-version';
import { mcpAvailable } from './mcp-available';
import type { McpAuthResolver } from './models/mcp-auth-resolver.interface';
import { MCP_AUTH_RESOLVER } from './models/mcp-auth-resolver.token';
import { MCP_PROTOCOL_VERSION_HEADER } from './models/mcp-protocol-version-header.const';
import type { McpRequest } from './models/mcp-request.interface';
import { MCP_USAGE_OUTCOME } from './models/mcp-usage-outcome.const';
import { MCP_WWW_AUTHENTICATE } from './models/mcp-www-authenticate.const';
import { McpUsageService } from './usage/mcp-usage.service';
import { secondsUntilNextUtcDay } from './usage/usage-day';

const WWW_AUTHENTICATE_HEADER = 'WWW-Authenticate';
const UNSUPPORTED_PROTOCOL_VERSION = 'Unsupported MCP-Protocol-Version';

/**
 * Authenticates `POST /api/mcp` (ADR 0053 point 5), method level so moving the public marker can
 * never skip it; runs after the throttler and `CsrfGuard`. Missing, malformed, unknown or revoked
 * token → 401 with `WWW-Authenticate`; a demo or non-Pro account → 403 (tokens stay listed and
 * revocable); an unsupported `MCP-Protocol-Version` header → 400, before anything is counted; past
 * the per-token daily cap → 429 with `Retry-After` (the next UTC day); a token revoked while the call
 * was checked → 401. Only then is the call counted and `request.mcp` set. Every authenticated call
 * counts, notifications included (each is a request the server answers). The session cookie is never read here.
 */
@Injectable()
export class McpTokenGuard implements CanActivate {
  constructor(
    @Inject(MCP_AUTH_RESOLVER) private readonly resolver: McpAuthResolver,
    private readonly usage: McpUsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<McpRequest>();
    const res = http.getResponse<Response>();
    const caller = await this.resolver.resolve(req);
    if (!caller) throw this.unauthorized(res);
    if (caller.account.isDemo) throw new ForbiddenException(MCP_ERROR_MESSAGE.DemoUser);
    if (!mcpAvailable(caller.account)) throw new ForbiddenException(MCP_ERROR_MESSAGE.NotAvailable);
    // A request the server refuses anyway must not use up the daily cap.
    if (!isSupportedProtocolHeader(req.headers[MCP_PROTOCOL_VERSION_HEADER])) {
      throw new BadRequestException(UNSUPPORTED_PROTOCOL_VERSION);
    }
    const now = new Date();
    const reservation = await this.usage.reserve(caller.principal.tokenId, now);
    switch (reservation.kind) {
      case MCP_USAGE_OUTCOME.Revoked:
        throw this.unauthorized(res);
      case MCP_USAGE_OUTCOME.Capped:
        res.setHeader(RETRY_AFTER_HEADER, String(secondsUntilNextUtcDay(now)));
        throw new HttpException(MCP_ERROR_MESSAGE.DailyCapReached, HttpStatus.TOO_MANY_REQUESTS);
      case MCP_USAGE_OUTCOME.Counted:
        req.mcp = caller.principal;
        return true;
    }
  }

  private unauthorized(res: Response): UnauthorizedException {
    res.setHeader(WWW_AUTHENTICATE_HEADER, MCP_WWW_AUTHENTICATE);
    return new UnauthorizedException(MCP_ERROR_MESSAGE.Unauthorized);
  }
}
