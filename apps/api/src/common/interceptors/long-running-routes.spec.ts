/**
 * The request timeout exemption (ADR 0052 point 2): exactly the routes of `LONG_RUNNING_ROUTES` carry
 * `@LongRunning()`, each with a reason; every other handler is still cut at `REQUEST_TIMEOUT_MS`.
 */
import { Controller, Get, Post } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import { HTTP_METHOD } from '../auth/models/http-method.const';
import type { RouteScan } from '../auth/models/route-scan.interface';
import { scanRoutes } from '../auth/scan-routes';
import { findLongRunningViolations } from './find-long-running-violations';
import { LongRunning } from './long-running.decorator';
import { LONG_RUNNING_ROUTES } from './models/long-running-route.const';

@Controller('bad-long')
class UnlistedLongRunningController {
  @Post()
  @LongRunning()
  run(): string {
    return 'ok';
  }

  @Get()
  read(): string {
    return 'ok';
  }
}

async function scanOf(...controllers: (new () => object)[]): Promise<RouteScan> {
  const moduleRef = await Test.createTestingModule({
    imports: [DiscoveryModule],
    controllers,
  }).compile();
  try {
    return scanRoutes(moduleRef);
  } finally {
    await moduleRef.close();
  }
}

describe('long-running routes', () => {
  let t: AuthTestApp;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  it('marks exactly the routes listed in LONG_RUNNING_ROUTES, each with a reason', () => {
    const scan = scanRoutes(t.app);
    expect(scan.routes.length).toBeGreaterThan(0);
    expect(findLongRunningViolations(scan)).toEqual([]);
    for (const route of LONG_RUNNING_ROUTES) expect(route.reason.trim()).not.toBe('');
  });

  it('reports a marked handler that is not listed, and only that handler', async () => {
    const scan = await scanOf(UnlistedLongRunningController);
    expect(findLongRunningViolations(scan, [])).toEqual([
      `long-running-mismatch: ${HTTP_METHOD.Post} /api/bad-long`,
    ]);
  });

  it('reports a listed route without the marker and an empty reason', async () => {
    const scan = await scanOf(UnlistedLongRunningController);
    expect(
      findLongRunningViolations(scan, [
        { method: HTTP_METHOD.Post, path: '/api/bad-long', reason: ' ' },
        { method: HTTP_METHOD.Get, path: '/api/bad-long', reason: 'listed' },
      ]),
    ).toEqual([
      `long-running-mismatch: ${HTTP_METHOD.Get} /api/bad-long`,
      'empty-reason: /api/bad-long',
    ]);
  });
});
