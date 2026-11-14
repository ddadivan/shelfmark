import type { ContractScenario } from '../models/contract-scenario.interface';
import { expectAdminStatsShape } from '../support/expect-admin-stats-shape';
import { scenario } from '../support/scenario';

/**
 * The admin usage stats (#333). The numbers differ by design (the API counts its real users, the
 * mock answers a fixture), so the scenario compares the agreed shape and the privacy rules: only
 * allow-listed fields, every feature and milestone in order, the series of the right length
 * ending today, and no group below the minimum size.
 */
export const ADMIN_SCENARIOS: readonly ContractScenario[] = [
  scenario(
    'admin',
    'stats are aggregates only, in the agreed shape, with small groups hidden',
    async ({ admin }) => {
      expectAdminStatsShape(await admin.stats());
    },
  ),
];
