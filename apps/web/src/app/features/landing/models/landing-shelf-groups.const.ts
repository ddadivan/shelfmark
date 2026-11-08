import type { LandingShelfGroup } from './landing-shelf-group.interface';

/** The same five links as in the chat, sorted into four folders with a note each. */
export const LANDING_SHELF_GROUPS: readonly LandingShelfGroup[] = [
  {
    id: 'angular',
    folderKey: 'landing.shelf.folders.angular',
    links: [
      {
        id: 'signal-forms',
        letter: 'Y',
        titleKey: 'landing.shelf.links.signalForms.title',
        noteKey: 'landing.shelf.links.signalForms.note',
      },
      {
        id: 'zoneless',
        letter: 'A',
        titleKey: 'landing.shelf.links.zoneless.title',
        noteKey: 'landing.shelf.links.zoneless.note',
      },
    ],
  },
  {
    id: 'courses',
    folderKey: 'landing.shelf.folders.courses',
    links: [
      {
        id: 'nestjs',
        letter: 'S',
        titleKey: 'landing.shelf.links.nestjs.title',
        noteKey: 'landing.shelf.links.nestjs.note',
      },
    ],
  },
  {
    id: 'clothes',
    folderKey: 'landing.shelf.folders.clothes',
    links: [
      {
        id: 'coat',
        letter: 'C',
        titleKey: 'landing.shelf.links.coat.title',
        noteKey: 'landing.shelf.links.coat.note',
      },
    ],
  },
  {
    id: 'recipes',
    folderKey: 'landing.shelf.folders.recipes',
    links: [
      {
        id: 'ramen',
        letter: 'R',
        titleKey: 'landing.shelf.links.ramen.title',
        noteKey: 'landing.shelf.links.ramen.note',
      },
    ],
  },
];
