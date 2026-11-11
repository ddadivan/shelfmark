import type { FeedbackScreenshotUpload } from '@shelfmark/contracts';

/** A screenshot the user chose: what is sent, plus what the form shows about it. */
export interface FeedbackScreenshotAttachment {
  upload: FeedbackScreenshotUpload;
  /** The file name, shown next to the thumbnail. */
  name: string;
  /** Size of the file in bytes. */
  size: number;
  /** `data:` URL of the image for the thumbnail (the CSP allows `data:`, not `blob:`). */
  previewUrl: string;
}
