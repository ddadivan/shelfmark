import type { LandingLinkEntry } from './landing-link-entry.interface';

/** Links of each folder of the "after" scene, by folder id (`LANDING_TREE_ROWS`). */
export const LANDING_FOLDER_LISTS: Readonly<Record<string, readonly LandingLinkEntry[]>> = {
  clothes: [
    {
      id: 'coat',
      letter: 'C',
      titleKey: 'landing.after.links.coat.title',
      noteKey: 'landing.after.links.coat.note',
    },
    {
      id: 'boots',
      letter: 'D',
      titleKey: 'landing.after.links.boots.title',
      noteKey: 'landing.after.links.boots.note',
    },
    {
      id: 'jumper',
      letter: 'U',
      titleKey: 'landing.after.links.jumper.title',
      noteKey: 'landing.after.links.jumper.note',
    },
  ],
  angular: [
    {
      id: 'signal-forms',
      letter: 'Y',
      titleKey: 'landing.after.links.signalForms.title',
      noteKey: 'landing.after.links.signalForms.note',
    },
    {
      id: 'nestjs',
      letter: 'S',
      titleKey: 'landing.after.links.nestjs.title',
      noteKey: 'landing.after.links.nestjs.note',
    },
    {
      id: 'zoneless',
      letter: 'A',
      titleKey: 'landing.after.links.zoneless.title',
      noteKey: 'landing.after.links.zoneless.note',
    },
  ],
  recipes: [
    {
      id: 'ramen',
      letter: 'R',
      titleKey: 'landing.after.links.ramen.title',
      noteKey: 'landing.after.links.ramen.note',
    },
    {
      id: 'focaccia',
      letter: 'B',
      titleKey: 'landing.after.links.focaccia.title',
      noteKey: 'landing.after.links.focaccia.note',
    },
    {
      id: 'kimchi',
      letter: 'K',
      titleKey: 'landing.after.links.kimchi.title',
      noteKey: 'landing.after.links.kimchi.note',
    },
  ],
};
