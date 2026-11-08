import { DEMO_ENDPOINT } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { findRouteViolations, scanRoutes } from '../common/auth/scan-routes';
import { PUBLIC_ROUTES } from '../common/auth/models/public-route.const';
import { CRON_ROUTE } from './models/cron-route.const';

describe('demo routes in the route protection scan', () => {
  let t: AuthTestApp;

  beforeAll(async () => {
    t = await createAuthTestApp({ providers: false });
  });

  afterAll(async () => {
    await t.close();
  });

  it('exposes exactly the demo create and the cron cleanup as new public routes, with reasons', () => {
    const scan = scanRoutes(t.app);
    expect(findRouteViolations(scan)).toEqual([]);
    const keys = scan.routes.map((route) => route.key);
    expect(keys).toContain(`POST ${DEMO_ENDPOINT.Create}`);
    expect(keys).toContain(`GET ${CRON_ROUTE.Path}`);

    const listed = PUBLIC_ROUTES.map((route) => `${route.method} ${route.path}`);
    expect(listed).toEqual(
      expect.arrayContaining([`POST ${DEMO_ENDPOINT.Create}`, `GET ${CRON_ROUTE.Path}`]),
    );
    for (const route of PUBLIC_ROUTES) expect(route.reason.split(' ').length).toBeGreaterThan(2);
  });
});
