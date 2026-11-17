import { reminders, rulesByDomain, sideBySide, folderStyling } from '../support/whats-new-scenes';
import type { WhatsNewShot } from './whats-new-shot.interface';

/** The 2.1.0 New items, in their priority order (`changelog.const.ts`). */
export const WHATS_NEW_SHOTS: readonly WhatsNewShot[] = [
  { slug: 'side-by-side', prepare: sideBySide },
  { slug: 'folder-styling', prepare: folderStyling },
  { slug: 'rules-by-domain', prepare: rulesByDomain },
  { slug: 'reminders', prepare: reminders },
];
