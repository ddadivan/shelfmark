import {
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
import { mcpAvailable } from './mcp-available';
import type { McpAuthResolver } from './models/mcp-auth-resolver.interface';
import { MCP_AUTH_RESOLVER } from './models/mcp-auth-resolver.token';
import type { McpRequest } from './models/mcp-request.interface';
import { MCP_WWW_AUTHENTICATE } from './models/mcp-www-authenticate.const';
import { McpUsageService } from './usage/mcp-usage.service';
import { secondsUntilNextUtcDay } from './usage/usage-day';

const WWW_AUTHENTICATE_HEADER = 'WWW-Authenticate';

/**
 * Authenticates `POST /api/mcp` (ADR 0053 point 5), method level so moving the public marker can
 * never skip it; runs after the throttler and `CsrfGuard`. Missing, malformed, unknown or revoked
 * token → 401 with `WWW-Authenticate`; a demo or non-Pro account → 403 (tokens stay listed and
 * revocable); past the per-token daily cap → 429 with `Retry-After` (the next UTC day). Only then is
 * the call counted and `request.mcp` set. The session cookie is never read here.
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
    if (!caller) {
      res.setHeader(WWW_AUTHENTICATE_HEADER, MCP_WWW_AUTHENTICATE);
      throw new UnauthorizedException(MCP_ERROR_MESSAGE.Unauthorized);
    }
    if (caller.account.isDemo) throw new ForbiddenException(MCP_ERROR_MESSAGE.DemoUser);
    if (!mcpAvailable(caller.account)) throw new ForbiddenException(MCP_ERROR_MESSAGE.NotAvailable);
    const now = new Date();
    if ((await this.usage.reserve(caller.principal.tokenId, now)) === null) {
      res.setHeader(RETRY_AFTER_HEADER, String(secondsUntilNextUtcDay(now)));
      throw new HttpException(MCP_ERROR_MESSAGE.DailyCapReached, HttpStatus.TOO_MANY_REQUESTS);
    }
    req.mcp = caller.principal;
    return true;
  }
}
