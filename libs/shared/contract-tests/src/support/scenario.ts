import type { ContractApis } from '../models/contract-apis.interface';
import type { ContractScenario } from '../models/contract-scenario.interface';

/** Names a scenario; `domain` prefixes the name so a failure says where it belongs. */
export function scenario(
  domain: string,
  name: string,
  run: (apis: ContractApis) => Promise<void>,
): ContractScenario {
  return { name: `${domain}: ${name}`, run };
}
