import type { ContractScenario } from '../models/contract-scenario.interface';
import { EXPORT_SCENARIOS } from './export-scenarios.const';
import { FEEDBACK_SCENARIOS } from './feedback-scenarios.const';
import { FOLDERS_SCENARIOS } from './folders-scenarios.const';
import { LINKS_SCENARIOS } from './links-scenarios.const';
import { PINS_SCENARIOS } from './pins-scenarios.const';
import { SETTINGS_SCENARIOS } from './settings-scenarios.const';
import { SHARES_SCENARIOS } from './shares-scenarios.const';
import { TAGS_SCENARIOS } from './tags-scenarios.const';
import { TRASH_SCENARIOS } from './trash-scenarios.const';
import { VIEWS_SCENARIOS } from './views-scenarios.const';

/** Every scenario, run by both runners; names are unique (checked by the lib's own spec). */
export const CONTRACT_SCENARIOS: readonly ContractScenario[] = [
  ...FOLDERS_SCENARIOS,
  ...LINKS_SCENARIOS,
  ...TAGS_SCENARIOS,
  ...PINS_SCENARIOS,
  ...VIEWS_SCENARIOS,
  ...TRASH_SCENARIOS,
  ...SETTINGS_SCENARIOS,
  ...SHARES_SCENARIOS,
  ...FEEDBACK_SCENARIOS,
  ...EXPORT_SCENARIOS,
];
