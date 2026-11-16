import { previewDraft } from '../utils/preview-draft';
import { CHANGELOG } from './changelog.const';
import { CHANGELOG_SHOWS_DRAFT } from './changelog-shows-draft.const';
import type { ChangelogRelease } from './changelog-release.interface';

/** What /changelog, What's new and the landing read: `CHANGELOG`, plus the draft in development. */
export const SHOWN_CHANGELOG: readonly ChangelogRelease[] = CHANGELOG_SHOWS_DRAFT
  ? previewDraft(CHANGELOG, new Date().toLocaleDateString('sv'))
  : CHANGELOG;
