import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  RULE_ENDPOINT,
  RULE_OFFER_ENDPOINT,
  type CheckRuleOfferRequest,
  type CreateRuleRequest,
  type DismissRuleOfferRequest,
  type ListRulesResponse,
  type RuleMatchesResponse,
  type RuleOfferResponse,
  type RuleResponse,
  type UpdateRuleRequest,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { RulesApi } from '../models/rules-api.interface';

/** `RulesApi` over `/api/rules`. Every call skips the global error toast: the caller says what failed. */
@Service()
export class HttpRulesApi implements RulesApi {
  private readonly http = inject(HttpClient);

  list(): Observable<ListRulesResponse> {
    return this.http.get<ListRulesResponse>(RULE_ENDPOINT, { context: skipErrorToast() });
  }

  create(request: CreateRuleRequest): Observable<RuleResponse> {
    return this.http.post<RuleResponse>(RULE_ENDPOINT, request, { context: skipErrorToast() });
  }

  update(id: string, request: UpdateRuleRequest): Observable<RuleResponse> {
    return this.http.patch<RuleResponse>(`${RULE_ENDPOINT}/${encodeURIComponent(id)}`, request, {
      context: skipErrorToast(),
    });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${RULE_ENDPOINT}/${encodeURIComponent(id)}`, {
      context: skipErrorToast(),
    });
  }

  matches(id: string): Observable<RuleMatchesResponse> {
    return this.http.get<RuleMatchesResponse>(
      `${RULE_ENDPOINT}/${encodeURIComponent(id)}/matches`,
      { context: skipErrorToast() },
    );
  }

  checkOffer(linkIds: readonly string[]): Observable<RuleOfferResponse> {
    const body: CheckRuleOfferRequest = { linkIds: [...linkIds] };
    return this.http.post<RuleOfferResponse>(RULE_OFFER_ENDPOINT.Check, body, {
      context: skipErrorToast(),
    });
  }

  dismissOffer(domain: string): Observable<void> {
    const body: DismissRuleOfferRequest = { domain };
    return this.http.post<void>(RULE_OFFER_ENDPOINT.Dismiss, body, { context: skipErrorToast() });
  }
}
