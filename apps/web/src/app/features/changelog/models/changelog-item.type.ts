import type { ChangelogFeature } from './changelog-feature.interface';
import type { ChangelogFix } from './changelog-fix.interface';

/** One change of a release. */
export type ChangelogItem = ChangelogFeature | ChangelogFix;
