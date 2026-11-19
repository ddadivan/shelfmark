import { askChat } from '../support/whats-new-scenes';
import type { WhatsNewShot } from './whats-new-shot.interface';

/** The 2.3.0 New items, in their priority order (`changelog.const.ts`). */
export const WHATS_NEW_SHOTS: readonly WhatsNewShot[] = [{ slug: 'ask-chat', prepare: askChat }];
