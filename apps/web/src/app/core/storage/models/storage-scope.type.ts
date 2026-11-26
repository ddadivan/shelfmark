import type { STORAGE_SCOPE } from './storage-scope.const';

export type StorageScope = (typeof STORAGE_SCOPE)[keyof typeof STORAGE_SCOPE];
