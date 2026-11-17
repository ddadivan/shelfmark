import type { Observable } from 'rxjs';
import type {
  CreateRuleRequest,
  ListRulesResponse,
  RuleMatchesResponse,
  RuleOfferResponse,
  RuleResponse,
  UpdateRuleRequest,
} from '@shelfmark/contracts';

/** Seam for the domain rules (`/api/rules`, #398): at most `RULE_LIMIT.PerUserMax`, one per domain. */
export interface RulesApi {
  /** `GET /api/rules`: every rule, sorted by domain. */
  list(): Observable<ListRulesResponse>;
  /** `POST /api/rules`: 404 for a missing folder, 409 for a taken domain or beyond the limit. */
  create(request: CreateRuleRequest): Observable<RuleResponse>;
  /** `PATCH /api/rules/:id`. */
  update(id: string, request: UpdateRuleRequest): Observable<RuleResponse>;
  /** `DELETE /api/rules/:id`. */
  remove(id: string): Observable<void>;
  /** `GET /api/rules/:id/matches`: the links in Unsorted the rule would file. */
  matches(id: string): Observable<RuleMatchesResponse>;
  /** `POST /api/rules/offers/check`: a rule to offer for links the user just filed (AI-2), or none. */
  checkOffer(linkIds: readonly string[]): Observable<RuleOfferResponse>;
  /** `POST /api/rules/offers/dismiss` (204): "Not now" for a domain, remembered. */
  dismissOffer(domain: string): Observable<void>;
}
