import { inject, InjectionToken } from '@angular/core';
import { MockFoldersApi } from '../mock/mock-folders.api';
import type { FoldersApi } from './folders-api.interface';

/** Default is the mock until the folders feature (#75) provides the real API. */
export const FOLDERS_API = new InjectionToken<FoldersApi>('FOLDERS_API', {
  factory: () => inject(MockFoldersApi),
});
