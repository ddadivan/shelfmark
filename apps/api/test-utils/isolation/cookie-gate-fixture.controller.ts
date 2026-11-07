import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AllowAnonymous } from '../../src/common/auth/allow-anonymous.decorator';
import { FIXTURE_ROUTE } from '../models/fixture-route.const';

/**
 * Deliberately broken: public, answers 200 with a cookie and a 401 that is NOT a bare `ApiError`
 * without one. Proves that `expectIsolated` checks the anonymous 401 body shape. Never in `AppModule`.
 */
@Controller(FIXTURE_ROUTE.CookieGate)
export class CookieGateFixtureController {
  // Public on purpose: this is the broken fixture. It only exists in the harness self-test app.
  @AllowAnonymous()
  @Get(':id')
  read(@Param('id') id: string, @Req() req: Request, @Res() res: Response): void {
    if (req.headers.cookie) {
      res.status(200).json({ id });
      return;
    }
    res
      .status(401)
      .json({ statusCode: 401, error: 'Unauthorized', message: 'no', requestId: 'x', id });
  }
}
