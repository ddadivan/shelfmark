import type { RuleResponse } from './rule-response.interface';

/** `GET /api/rules`: every rule of the user, sorted by domain (code unit order). */
export interface ListRulesResponse {
  items: RuleResponse[];
}
