import { CONTRACT_SCENARIOS } from '@shelfmark/contract-tests';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createHttpContractApis } from '../../test-utils/contract/create-http-contract-apis';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { signInAs } from '../../test-utils/sign-in-as';
import { SAFE_FETCH_ERROR_CODE } from '../fetcher/models/safe-fetch-error-code.const';
import { SafeFetchError } from '../fetcher/safe-fetch.error';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';

/**
 * Runner B of the contract scenarios (#341): the shared scenarios of `libs/shared/contract-tests`
 * against the real API. The web runs the same scenarios against its mock API classes
 * (`apps/web/src/app/contract/`); a difference between the two fails the build.
 */
describe('contract scenarios against the real API', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  let t: AuthTestApp;
  const savedAdminEmails = process.env['ADMIN_EMAILS'];

  beforeAll(async () => {
    // The scenario account is the admin, so the admin scenarios reach `/api/admin/*`.
    process.env['ADMIN_EMAILS'] = 'contract@example.com';
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch } }],
    });
  });

  beforeEach(() => {
    // No network: every page load fails, so a link keeps the title it was saved with.
    fetch.mockReset();
    fetch.mockRejectedValue(
      new SafeFetchError(
        SAFE_FETCH_ERROR_CODE.NetworkError,
        'No network in the contract scenarios',
      ),
    );
    resetRateLimits(t.app);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    if (savedAdminEmails === undefined) delete process.env['ADMIN_EMAILS'];
    else process.env['ADMIN_EMAILS'] = savedAdminEmails;
    await t.close();
  });

  it.each(CONTRACT_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
    '%s',
    async (_name, scenario) => {
      const user = await signInAs(t.app, t.baseUrl, {
        email: 'contract@example.com',
        name: 'Contract',
      });
      await scenario.run(createHttpContractApis(t.app, user.cookie));
    },
  );
});
