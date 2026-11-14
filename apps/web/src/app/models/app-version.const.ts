// eslint-disable-next-line @nx/enforce-module-boundaries -- the root package.json is the one version source (#424), not a project
import { version } from '../../../../../package.json';

/**
 * The app version (SemVer), read from the root `package.json` at build time (#424): shown in the
 * Settings footer, on `/about` and `/changelog`, and sent with a feedback message. Only the
 * `version` field reaches the bundle (esbuild drops the unused fields of an imported JSON file).
 * The release PR `stage → main` sets the minor release, a hotfix into `main` the patch
 * (PROJECT.md 9.3); `stage` carries the next release with a `-dev` suffix.
 */
export const APP_VERSION: string = version;
