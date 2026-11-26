import { LANDING_FOLDER } from './landing-folder.const';
import { LANDING_IMAGES } from './landing-images.const';
import type { LandingPreviewCard } from './landing-preview-card.interface';
import { LANDING_PREVIEW_KIND } from './landing-preview-kind.const';

/** The cards of the app preview, in feed order (16-landing). */
export const LANDING_PREVIEW_CARDS: readonly LandingPreviewCard[] = [
  {
    id: 'nihilism',
    image: LANDING_IMAGES.nihilism,
    product: false,
    kind: LANDING_PREVIEW_KIND.Video,
    folder: LANDING_FOLDER.WatchLater,
    favorite: false,
    note: true,
    site: { host: 'youtube.com', letter: 'Y', colour: '#e5322d' },
    tags: ['philosophy'],
  },
  {
    id: 'runners',
    image: LANDING_IMAGES.runners,
    product: true,
    kind: LANDING_PREVIEW_KIND.Shop,
    folder: LANDING_FOLDER.Shopping,
    favorite: true,
    note: true,
    site: { host: 'treerunners.example', letter: 'T', colour: '#3f6b4f' },
    tags: ['shoes', 'spring'],
  },
  {
    id: 'angular',
    image: LANDING_IMAGES.angular,
    product: false,
    kind: LANDING_PREVIEW_KIND.Video,
    folder: LANDING_FOLDER.Angular,
    favorite: true,
    note: false,
    site: { host: 'youtube.com', letter: 'Y', colour: '#e5322d' },
    tags: ['angular', 'docs'],
  },
  {
    id: 'excalidraw',
    image: LANDING_IMAGES.excalidraw,
    product: false,
    kind: LANDING_PREVIEW_KIND.Repo,
    folder: LANDING_FOLDER.Tools,
    favorite: true,
    note: false,
    site: { host: 'excalidraw.com', letter: 'E', colour: '#6965db' },
    tags: ['tools', 'diagrams'],
  },
  {
    id: 'jacket',
    image: LANDING_IMAGES.jacket,
    product: true,
    kind: LANDING_PREVIEW_KIND.Shop,
    folder: LANDING_FOLDER.Shopping,
    favorite: false,
    note: true,
    site: { host: 'ojai.example', letter: 'O', colour: '#8a6a4a' },
    tags: ['clothes'],
  },
  {
    id: 'neural',
    image: LANDING_IMAGES.neural,
    product: false,
    kind: LANDING_PREVIEW_KIND.Video,
    folder: LANDING_FOLDER.Learning,
    favorite: false,
    note: false,
    site: { host: 'youtube.com', letter: 'Y', colour: '#e5322d' },
    tags: ['ai', 'learning'],
  },
];
