/** One link a rule would change (`GET /api/rules/:id/matches`): its id and its tags now. */
export interface RuleMatch {
  id: string;
  tags: string[];
}
