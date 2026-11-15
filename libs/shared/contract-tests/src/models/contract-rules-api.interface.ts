import type {
  CreateRuleRequest,
  ListRulesResponse,
  RuleMatchesResponse,
  RuleResponse,
  UpdateRuleRequest,
} from '@shelfmark/contracts';

/** The domain rule endpoints (`/api/rules`, #398) as the scenarios call them. */
export interface ContractRulesApi {
  list(): Promise<ListRulesResponse>;
  create(request: CreateRuleRequest): Promise<RuleResponse>;
  update(id: string, request: UpdateRuleRequest): Promise<RuleResponse>;
  remove(id: string): Promise<void>;
  matches(id: string): Promise<RuleMatchesResponse>;
}
