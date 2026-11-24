import type { ReaderFont, ReaderLineWidth, ReaderTextSize, ReaderTone } from '@shelfmark/ui';

/** Reading settings of Reader (the Link page's popover): a preference of this device. */
export interface ReaderSettings {
  size: ReaderTextSize;
  font: ReaderFont;
  width: ReaderLineWidth;
  tone: ReaderTone;
}
