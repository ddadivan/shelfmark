import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExcludeEndpoint,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { McpTokenGuard } from './mcp-token.guard';
import { McpServerService } from './mcp-server.service';
import type { McpRequest } from './models/mcp-request.interface';

const ALLOW_HEADER = 'Allow';
const ALLOWED_METHODS = 'POST';

/**
 * The Shelfmark MCP server (#395, ADR 0054): a stateless Streamable HTTP endpoint for the user's own
 * assistant. Bearer personal tokens only; the session cookie is never read on these routes.
 */
@ApiTags('mcp')
@Controller('mcp')
export class McpController {
  constructor(private readonly server: McpServerService) {}

  // Public to the session guard: MCP clients cannot hold a session cookie. Authenticated by
  // `McpTokenGuard` on this handler (method level, so it can never be skipped), which fails closed.
  @Post()
  @AllowAnonymous()
  @UseGuards(McpTokenGuard)
  @RateLimit(RATE_LIMIT.Mcp)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'MCP JSON-RPC endpoint (Streamable HTTP, stateless)',
    description:
      'One JSON-RPC 2.0 message per request with `Authorization: Bearer smk_live_…`. Answers 200 with a JSON-RPC response, or 202 for notifications.',
  })
  @ApiOkResponse({ description: 'A JSON-RPC response' })
  @ApiBadRequestResponse({ description: 'Unsupported MCP-Protocol-Version header' })
  @ApiUnauthorizedResponse({ description: 'Missing, malformed, unknown or revoked token' })
  @ApiForbiddenResponse({ description: 'Not Pro, a demo account, or a foreign Origin' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit or daily call cap reached' })
  async handle(@Req() req: McpRequest, @Res() res: Response): Promise<void> {
    const principal = req.mcp;
    // Set by McpTokenGuard; a missing principal means the guard did not run: fail closed.
    if (!principal) throw new UnauthorizedException();
    // The MCP-Protocol-Version header is checked by McpTokenGuard, before the call is counted.
    const answer = await this.server.handle(req.body, principal);
    if (answer.body === null) {
      res.status(answer.status).end();
      return;
    }
    res.status(answer.status).json(answer.body);
  }

  // Public: answers 405 without data (no server-to-client stream in this stateless server).
  @Get()
  @AllowAnonymous()
  @RateLimit(RATE_LIMIT.Mcp)
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  @Header(ALLOW_HEADER, ALLOWED_METHODS)
  @ApiExcludeEndpoint()
  methodNotAllowedGet(): void {
    // 405, no body.
  }

  // Public: answers 405 without data (there are no sessions to end).
  @Delete()
  @AllowAnonymous()
  @RateLimit(RATE_LIMIT.Mcp)
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  @Header(ALLOW_HEADER, ALLOWED_METHODS)
  @ApiExcludeEndpoint()
  methodNotAllowedDelete(): void {
    // 405, no body.
  }
}
