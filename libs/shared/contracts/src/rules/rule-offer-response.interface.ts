import type { RuleOffer } from './rule-offer.interface';

/** `POST /api/rules/offers/check` answer. */
export interface RuleOfferResponse {
  offer: RuleOffer | null;
}
