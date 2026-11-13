import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser, OnboardingResponse } from '@shelfmark/contracts';
import type { Request, Response } from 'express';
import { SET_COOKIE_HEADER } from '../auth/models/auth-session-cookie.const';
import { SessionCookieService } from '../auth/session-cookie.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { DeleteAccountRequestDto } from './dto/delete-account-request.dto';
import { MeStatsResponseDto } from './dto/me-stats-response.dto';
import { OnboardingResponseDto } from './dto/onboarding-response.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UserSettingsResponseDto } from './dto/user-settings-response.dto';
import { MeStatsService } from './me-stats.service';
import { UsersService } from './users.service';

@ApiTags('me')
@Controller('me')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly users: UsersService,
    private readonly meStats: MeStatsService,
    private readonly sessionCookies: SessionCookieService,
  ) {}

  // Irreversible and guessable by a stolen session: stricter than the global default (5.8).
  @RateLimit(RATE_LIMIT.DeleteAccount)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the account and all data' })
  @ApiNoContentResponse({ description: 'Deleted; the session cookie is cleared' })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: 'Invalid body, or the email does not match the account',
  })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'No valid session' })
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() body: DeleteAccountRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.users.deleteAccount(user, body);
    // The account is gone: whatever happens now must still answer 204 with an expired cookie.
    let cookies: string[];
    try {
      cookies = await this.sessionCookies.clearingCookies(req.headers);
    } catch (error) {
      // Message only: never the stack, headers or the cause object (they can hold the cookie).
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Sign-out failed after account deletion: ${user.id} (${reason})`);
      cookies = this.sessionCookies.fallbackClearingCookies();
    }
    for (const cookie of cookies) {
      res.append(SET_COOKIE_HEADER, cookie);
    }
  }

  @Get('settings')
  @ApiOperation({ summary: 'Account settings (trash retention, folder colours, pause history)' })
  @ApiOkResponse({ type: UserSettingsResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'No valid session' })
  getSettings(@CurrentUser() user: AuthUser): Promise<UserSettingsResponseDto> {
    return this.users.getSettings(user);
  }

  // A read like `GET settings`: the global rate limit applies (a handful of aggregate queries).
  @Get('stats')
  @ApiOperation({
    summary: 'Your shelf: counts, top sites and tags, links per week, connected accounts',
  })
  @ApiOkResponse({ type: MeStatsResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'No valid session' })
  getStats(@CurrentUser() user: AuthUser): Promise<MeStatsResponseDto> {
    return this.meStats.stats(user.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Change account settings; send only the fields to change' })
  @ApiOkResponse({ type: UserSettingsResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid value or extra field' })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'No valid session' })
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateUserSettingsDto,
  ): Promise<UserSettingsResponseDto> {
    return this.users.updateSettings(user, body);
  }

  @Post('onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark the onboarding as completed (idempotent)' })
  @ApiOkResponse({ type: OnboardingResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'No valid session' })
  completeOnboarding(@CurrentUser() user: AuthUser): Promise<OnboardingResponse> {
    return this.users.completeOnboarding(user);
  }
}
