import { Controller, Get } from '@nestjs/common';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../../src/common/auth/current-user.decorator';
import { FIXTURE_ROUTE } from '../models/fixture-route.const';

/** Answers with the user the guard resolved (guard integration specs). */
@Controller(FIXTURE_ROUTE.WhoAmI)
export class WhoAmIFixtureController {
  @Get()
  whoAmI(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
