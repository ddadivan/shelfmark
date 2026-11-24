/** The columns of a personal token that leave the database for its owner (never the digest). */
export interface McpTokenRow {
  id: string;
  name: string;
  last4: string;
  includeNotes: boolean;
  /** A string column; `toMcpTokenSummary` narrows it to `McpTokenAccess`. */
  access: string;
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}
