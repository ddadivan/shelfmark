import {
  LINK_CLICK_ACTION,
  isPreviewableUrl,
  linkHost,
  toVideoEmbedUrl,
} from '@shelfmark/contracts';
import type { PreviewClick } from '../models/preview-click.interface';

/**
 * Whether a click on a card or row link opens the preview instead of the link (#553). On every
 * screen (#572): from 80em it opens beside the list, below it as a full-screen page with Back.
 * While a preview is open a plain click switches it; otherwise the setting decides. ⌘ / Ctrl does
 * the other one. Without an open preview, a site in "Sites that open in a new tab" and an address
 * the frame cannot show skip it (a video always previews in its player).
 */
export function wantsPreview(click: PreviewClick): boolean {
  const preferred = click.previewOpen || click.clickAction === LINK_CLICK_ACTION.Preview;
  if (preferred === click.modifier) {
    return false;
  }
  if (click.previewOpen || toVideoEmbedUrl(click.url) !== null) {
    return true;
  }
  const host = linkHost(click.url);
  return isPreviewableUrl(click.url) && host !== null && !click.newTabHosts.includes(host);
}
