import { type AdminFeedbackItem } from '@shelfmark/contracts';

/** One stored mock message and the user it belongs to. */
export interface MockFeedbackEntry {
  userId: string;
  message: AdminFeedbackItem;
  /**
   * A `data:` URL per screenshot, in order, for the admin inbox to show (`null` for an image too
   * big to keep in `localStorage`, which then points to the admin route like the real API).
   */
  previews?: (string | null)[];
}
