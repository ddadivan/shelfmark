import { LINK_LIMIT } from '../links/link-limit.const';

/**
 * Tidy Unsorted limits (AI-2, #390): `PageMax` links per review page, which is also one apply
 * request (`LINK_LIMIT.BatchMax`), and `SuggestionIdsPerLinkMax` selected suggestion ids per link
 * (at most `AI_LIMIT.SuggestedTagsMax` tags, one new tag and one folder).
 */
export const TIDY_LIMIT = {
  PageMax: LINK_LIMIT.BatchMax,
  SuggestionIdsPerLinkMax: 5,
} as const;
