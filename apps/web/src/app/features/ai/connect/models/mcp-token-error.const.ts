/** Why creating a personal token failed; each has its message in `ai.connect.create.error.*`. */
export const MCP_TOKEN_ERROR = {
  /** 409: the account already has `MCP_LIMIT.TokensPerUserMax` tokens. */
  Limit: 'limit',
  /** 403: the demo, or an account without Pro. */
  NotAvailable: 'notAvailable',
  /** Anything else (network, 400, 5xx). */
  Save: 'save',
} as const;
