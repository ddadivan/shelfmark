import type { ContractApis } from './contract-apis.interface';

/** One behaviour both back ends must show; a thrown error (assertion or call) fails it. */
export interface ContractScenario {
  /** By behaviour, unique across all scenarios. */
  name: string;
  run(apis: ContractApis): Promise<void>;
}
