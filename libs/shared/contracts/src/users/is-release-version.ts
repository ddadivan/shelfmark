import { RELEASE_VERSION_PATTERN } from './release-version-pattern.const';

/** True for a release version `x.y.z` (`RELEASE_VERSION_PATTERN`). */
export function isReleaseVersion(value: unknown): value is string {
  return typeof value === 'string' && RELEASE_VERSION_PATTERN.test(value);
}
