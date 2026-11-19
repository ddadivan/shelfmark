import { importGroups, linkKinds, newViewPhrase } from '../support/whats-new-scenes';
import type { WhatsNewShot } from './whats-new-shot.interface';

/** The 2.4.0 New items, in their priority order (`changelog.const.ts`). */
export const WHATS_NEW_SHOTS: readonly WhatsNewShot[] = [
  { slug: 'import-groups', prepare: importGroups },
  { slug: 'new-view', prepare: newViewPhrase },
  { slug: 'link-kinds', prepare: linkKinds },
];
