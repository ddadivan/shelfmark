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
  },
  {
    id: 'runners',
    image: LANDING_IMAGES.runners,
    product: true,
    kind: LANDING_PREVIEW_KIND.Shop,
    folder: LANDING_FOLDER.Shopping,
    favorite: true,
    note: true,
  },
  {
    id: 'angular',
    image: LANDING_IMAGES.angular,
    product: false,
    kind: LANDING_PREVIEW_KIND.Video,
    folder: LANDING_FOLDER.Angular,
    favorite: true,
    note: false,
  },
  {
    id: 'excalidraw',
    image: LANDING_IMAGES.excalidraw,
    product: false,
    kind: LANDING_PREVIEW_KIND.Repo,
    folder: LANDING_FOLDER.Tools,
    favorite: true,
    note: false,
  },
  {
    id: 'jacket',
    image: LANDING_IMAGES.jacket,
    product: true,
    kind: LANDING_PREVIEW_KIND.Shop,
    folder: LANDING_FOLDER.Shopping,
    favorite: false,
    note: true,
  },
  {
    id: 'neural',
    image: LANDING_IMAGES.neural,
    product: false,
    kind: LANDING_PREVIEW_KIND.Video,
    folder: LANDING_FOLDER.Learning,
    favorite: false,
    note: false,
  },
];
