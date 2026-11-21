import type { LinkClickAction } from '@shelfmark/contracts';

/** What decides whether a click on a card or row opens the preview (`wantsPreview`). */
export interface PreviewClick {
  url: string;
  /** `PREVIEW_CLICK_SETTINGS`: off, the two settings below are not read. */
  settingsOn: boolean;
  /** Settings › Library › Clicking a link. */
  clickAction: LinkClickAction;
  /** Settings › Library › Sites that open in a new tab. */
  newTabHosts: readonly string[];
  /** The split view can show (from 80em). */
  wide: boolean;
  /** A preview is open already: a plain click switches it to the clicked link. */
  previewOpen: boolean;
  /** ⌘ or Ctrl held: do the other one. */
  modifier: boolean;
}
