import { Body, Controller, Delete, HttpCode, HttpStatus, Req, Res } from '@nestjs/common';
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
    for (const cookie of await this.sessionCookies.clearingCookies(req.headers)) {
      res.append('Set-Cookie', cookie);
    }
  }
}
