import type { ChangelogFeature } from './changelog-feature.interface';
import type { ChangelogFix } from './changelog-fix.interface';
import type { ChangelogImprovement } from './changelog-improvement.interface';

/** One change of a release. */
export type ChangelogItem = ChangelogFeature | ChangelogImprovement | ChangelogFix;
