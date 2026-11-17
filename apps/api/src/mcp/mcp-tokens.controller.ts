import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { CreateMcpTokenDto } from './dto/create-mcp-token.dto';
import { CreateMcpTokenResponseDto } from './dto/create-mcp-token-response.dto';
import { McpTokensResponseDto } from './dto/mcp-tokens-response.dto';
import { McpTokensService } from './tokens/mcp-tokens.service';

/**
 * Personal MCP tokens of the signed-in user (#395, ADR 0053). Session only (the MCP server itself
 * takes the token, never a cookie); the global CSRF guard covers the unsafe methods.
 */
@ApiTags('mcp')
@Controller('mcp/tokens')
export class McpTokensController {
  constructor(private readonly tokens: McpTokensService) {}

  @Get()
  @ApiOkResponse({ type: McpTokensResponseDto })
  @ApiOperation({ summary: 'The personal MCP tokens of the user, newest first (never secrets)' })
  list(@CurrentUser() user: AuthUser): Promise<McpTokensResponseDto> {
    return this.tokens.list(user.id);
  }

  @Post()
  @RateLimit(RATE_LIMIT.McpTokenWrite)
  @ApiCreatedResponse({ type: CreateMcpTokenResponseDto, description: 'The secret, shown once' })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiForbiddenResponse({ description: 'Demo account, not Pro, or a foreign Origin' })
  @ApiConflictResponse({ description: 'The token limit is reached' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiOperation({ summary: 'Create a personal MCP token; the only response with the secret' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateMcpTokenDto,
  ): Promise<CreateMcpTokenResponseDto> {
    return this.tokens.create(user.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.McpTokenWrite)
  @ApiNoContentResponse({ description: 'Revoked: the token stops working at once' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiOperation({ summary: 'Revoke a personal MCP token' })
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.tokens.revoke(user.id, id);
  }
}
