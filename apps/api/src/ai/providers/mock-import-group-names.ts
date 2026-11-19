import { MOCK_AI } from '../models/mock-ai-limit.const';
import { fallbackImportGroupName } from '../prompt/fallback-import-group-name';
import type { ImportGroupNamesInput } from '../models/import-group-names-input.interface';
import type { ImportGroupNamesOutcome } from '../models/import-group-names-outcome.type';

/**
 * The mock's group names: deterministic, from the cluster's own words (`fallbackImportGroupName`:
 * the title word most titles share, else the site). A title containing `ai-refuse` answers a
 * refusal and one containing `ai-fail` a retryable outage (tests, e2e).
 */
export function mockImportGroupNames(input: ImportGroupNamesInput): ImportGroupNamesOutcome {
  const titles = input.groups.flatMap((group) => group.titles.map((title) => title.toLowerCase()));
  if (titles.some((title) => title.includes(MOCK_AI.FailMarker))) {
    return { type: 'error', retryable: true };
  }
  if (titles.some((title) => title.includes(MOCK_AI.RefuseMarker))) return { type: 'refusal' };
  return {
    type: 'output',
    output: {
      groups: input.groups.map((group) => ({
        key: group.key,
        name: fallbackImportGroupName(group.titles, group.hosts),
      })),
    },
  };
}
