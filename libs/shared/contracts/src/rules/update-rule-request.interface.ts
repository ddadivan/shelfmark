/** `PATCH /api/rules/:id` body: the fields to change; the rule must still have a folder or a tag. */
export interface UpdateRuleRequest {
  domain?: string;
  folderId?: string | null;
  tags?: string[];
}
