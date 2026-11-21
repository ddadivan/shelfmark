import type { LinkFraming } from '@shelfmark/contracts';

/** A host verdict and when it was made (`frame_checks`). */
export interface FrameVerdict {
  framing: LinkFraming;
  checkedAt: Date;
}
