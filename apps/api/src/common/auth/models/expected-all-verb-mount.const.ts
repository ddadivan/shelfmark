import { AUTH_BASE_PATH } from '../../../auth/models/auth-base-path.const';
import { API_GLOBAL_PREFIX } from '../../../app/models/api-global-prefix.const';

/**
 * The all-verb Express layers Better Auth's integration registers outside Nest's router, each
 * expected exactly once. Any other all-verb layer (or a second copy) is a route the scan must report.
 */
export const EXPECTED_ALL_VERB_MOUNTS: readonly string[] = [
  `/${API_GLOBAL_PREFIX}`,
  AUTH_BASE_PATH,
  `${AUTH_BASE_PATH}/*path`,
];
