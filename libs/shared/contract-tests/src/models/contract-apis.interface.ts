import type { ContractExportApi } from './contract-export-api.interface';
import type { ContractFeedbackApi } from './contract-feedback-api.interface';
import type { ContractFoldersApi } from './contract-folders-api.interface';
import type { ContractLinksApi } from './contract-links-api.interface';
import type { ContractPinsApi } from './contract-pins-api.interface';
import type { ContractSettingsApi } from './contract-settings-api.interface';
import type { ContractSharesApi } from './contract-shares-api.interface';
import type { ContractTagsApi } from './contract-tags-api.interface';
import type { ContractTrashApi } from './contract-trash-api.interface';
import type { ContractViewsApi } from './contract-views-api.interface';

/**
 * Everything a scenario can call, with the shapes of `@shelfmark/contracts`. Runner A (apps/web)
 * implements it over the mock API classes, runner B (apps/api) over the real Nest app with
 * supertest. Both start every scenario from a new empty account.
 */
export interface ContractApis {
  links: ContractLinksApi;
  folders: ContractFoldersApi;
  tags: ContractTagsApi;
  pins: ContractPinsApi;
  views: ContractViewsApi;
  trash: ContractTrashApi;
  settings: ContractSettingsApi;
  shares: ContractSharesApi;
  feedback: ContractFeedbackApi;
  exports: ContractExportApi;
}
