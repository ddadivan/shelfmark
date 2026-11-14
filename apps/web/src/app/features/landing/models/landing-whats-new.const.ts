import type { LandingWhatsNewEntry } from './landing-whats-new-entry.interface';

/**
 * "What's new" on `/about` (#270), newest first. Edited by hand with each release: add an entry
 * and its `landing.whatsNew.items.<id>` keys.
 */
export const LANDING_WHATS_NEW: readonly LandingWhatsNewEntry[] = [
  {
    id: 'trash',
    date: '2026-11-10',
    titleKey: 'landing.whatsNew.items.trash.title',
    textKey: 'landing.whatsNew.items.trash.text',
  },
  {
    id: 'tabs',
    date: '2026-11-10',
    titleKey: 'landing.whatsNew.items.tabs.title',
    textKey: 'landing.whatsNew.items.tabs.text',
  },
  {
    id: 'move',
    date: '2026-11-10',
    titleKey: 'landing.whatsNew.items.move.title',
    textKey: 'landing.whatsNew.items.move.text',
  },
  {
    id: 'refresh',
    date: '2026-11-10',
    titleKey: 'landing.whatsNew.items.refresh.title',
    textKey: 'landing.whatsNew.items.refresh.text',
  },
];
