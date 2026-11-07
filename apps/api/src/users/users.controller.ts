import { Body, Controller, Delete, HttpCode, HttpStatus, Logger, Req, Res } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import type { Request, Response } from 'express';
import { SessionCookieService } from '../auth/session-cookie.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { DeleteAccountRequestDto } from './dto/delete-account-request.dto';
import { UsersService } from './users.service';

@ApiTags('me')
@Controller('me')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly users: UsersService,
    private readonly sessionCookies: SessionCookieService,
  ) {}

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the account and all data' })
  @ApiNoContentResponse({ description: 'Deleted; the session cookie is cleared' })
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
    } catch {
      this.logger.warn(`Sign-out failed after account deletion: ${user.id}`);
      cookies = this.sessionCookies.fallbackClearingCookies();
    }
    for (const cookie of cookies) {
      res.append('Set-Cookie', cookie);
    }
  }
}
