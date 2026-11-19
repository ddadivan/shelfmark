import type { IMPORT_GROUPS_ERROR } from './import-groups-error.const';

export type ImportGroupsError = (typeof IMPORT_GROUPS_ERROR)[keyof typeof IMPORT_GROUPS_ERROR];
