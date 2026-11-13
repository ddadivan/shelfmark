import { CONTRACT_SCENARIOS } from '@shelfmark/contract-tests';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { createMockContractApis } from './testing/create-mock-contract-apis';

/**
 * Runner A of the contract scenarios (#341): the shared scenarios of `libs/shared/contract-tests`
 * against the mock API classes. The API runs the same scenarios (`apps/api/src/contract/`); a
 * difference between the two fails the build.
 */
describe('contract scenarios against the mock API', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(CONTRACT_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
    '%s',
    async (_name, scenario) => {
      await scenario.run(createMockContractApis());
    },
  );
});
