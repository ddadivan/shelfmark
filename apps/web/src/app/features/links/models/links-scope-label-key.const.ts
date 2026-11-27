import { scopeLabelKey } from '../utils/scope-label-key';
import { LINKS_SCOPE } from './links-scope.const';
import type { LinksScope } from './links-scope.type';

/** `scopeLabelKey` per scope, for templates (`LINKS_SCOPE_LABEL_KEY.unsorted | transloco`). */
export const LINKS_SCOPE_LABEL_KEY: Readonly<Record<LinksScope, string>> = {
  [LINKS_SCOPE.All]: scopeLabelKey(LINKS_SCOPE.All),
  [LINKS_SCOPE.Unsorted]: scopeLabelKey(LINKS_SCOPE.Unsorted),
  [LINKS_SCOPE.Favorites]: scopeLabelKey(LINKS_SCOPE.Favorites),
  [LINKS_SCOPE.Folder]: scopeLabelKey(LINKS_SCOPE.Folder),
};
