import type { LinkDuplicate } from './link-duplicate.interface';
import type { LinkPreview } from './link-preview.interface';

/** `POST /api/links/preview` response. */
export interface LinkPreviewResponse {
  preview: LinkPreview;
  /** The existing link when the URL is already saved; `null` otherwise. */
  duplicate: LinkDuplicate | null;
}
