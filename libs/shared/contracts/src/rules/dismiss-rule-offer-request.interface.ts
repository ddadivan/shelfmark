/** `POST /api/rules/offers/dismiss` body ("Not now"): the offer's domain. */
export interface DismissRuleOfferRequest {
  domain: string;
}
