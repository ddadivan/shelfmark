/** `POST /api/rules/offers/check` body: links the user just filed. */
export interface CheckRuleOfferRequest {
  /** 1 to `LINK_LIMIT.BatchMax` distinct link ids; foreign, missing and trashed ids are ignored. */
  linkIds: string[];
}
