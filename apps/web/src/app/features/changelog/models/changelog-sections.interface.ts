import type { ChangelogFeature } from './changelog-feature.interface';
import type { ChangelogFix } from './changelog-fix.interface';
import type { ChangelogImprovement } from './changelog-improvement.interface';

/** The items of one release grouped for `/changelog`; an empty list is not shown. */
export interface ChangelogSections {
  readonly features: readonly ChangelogFeature[];
  readonly improvements: readonly ChangelogImprovement[];
  readonly fixes: readonly ChangelogFix[];
}
