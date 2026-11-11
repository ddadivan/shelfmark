import { FOLDER_COLOUR, FOLDER_ICON } from '@shelfmark/contracts';
import { DEMO_FOLDER_KEY } from './demo-folder-key.const';
import type { DemoSeedFolder } from './demo-seed-folder.interface';

/**
 * The demo folders as in the Main mockup: Work holds Angular (with Signals and Forms) and
 * Courses; Clothes and Recipes stand on their own; Angular is pinned. The folder icon set is a
 * curated subset, so the nearest glyphs stand in for the mockup's briefcase, code and cap.
 */
export const DEMO_SEED_FOLDERS: readonly DemoSeedFolder[] = [
  {
    key: DEMO_FOLDER_KEY.Work,
    parent: null,
    name: 'Work',
    colour: FOLDER_COLOUR.Ocean,
    icon: FOLDER_ICON.Cards,
  },
  {
    key: DEMO_FOLDER_KEY.Angular,
    parent: DEMO_FOLDER_KEY.Work,
    name: 'Angular',
    colour: FOLDER_COLOUR.Clay,
    icon: FOLDER_ICON.Monitor,
    pinned: true,
  },
  {
    key: DEMO_FOLDER_KEY.Signals,
    parent: DEMO_FOLDER_KEY.Angular,
    name: 'Signals',
    colour: FOLDER_COLOUR.Ocean,
    icon: FOLDER_ICON.Link,
  },
  {
    key: DEMO_FOLDER_KEY.Forms,
    parent: DEMO_FOLDER_KEY.Angular,
    name: 'Forms',
    colour: FOLDER_COLOUR.Teal,
    icon: FOLDER_ICON.List,
  },
  {
    key: DEMO_FOLDER_KEY.Courses,
    parent: DEMO_FOLDER_KEY.Work,
    name: 'Courses',
    colour: FOLDER_COLOUR.Plum,
    icon: FOLDER_ICON.Bookmark,
  },
  {
    key: DEMO_FOLDER_KEY.Clothes,
    parent: null,
    name: 'Clothes',
    colour: FOLDER_COLOUR.Rose,
    icon: FOLDER_ICON.Tag,
  },
  {
    key: DEMO_FOLDER_KEY.Recipes,
    parent: null,
    name: 'Recipes',
    colour: FOLDER_COLOUR.Amber,
    icon: FOLDER_ICON.Star,
  },
];
