import type { TidyApplyItem } from './tidy-apply-item.interface';

/** `POST /api/ai/tidy/apply` body. */
export interface TidyApplyRequest {
  /** 1 to `TIDY_LIMIT.PageMax` items with distinct link ids. */
  items: TidyApplyItem[];
}
