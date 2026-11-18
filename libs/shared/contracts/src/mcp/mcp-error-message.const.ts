import { MCP_LIMIT } from './mcp-limit.const';

/** Error messages of the MCP token API and server, one place so the API, the tests and the web agree. */
export const MCP_ERROR_MESSAGE = {
  /** A foreign or missing token id. */
  NotFound: 'Token not found',
  LimitReached: `Token limit reached (${MCP_LIMIT.TokensPerUserMax})`,
  DemoUser: 'Demo accounts cannot connect an assistant',
  /** The account is not on a plan that includes the MCP server (Pro). */
  NotAvailable: 'Connecting an assistant is part of Pro',
  /** A missing, malformed, unknown or revoked bearer token on the MCP server. */
  Unauthorized: 'A valid personal token is required',
  DailyCapReached: `Daily call limit reached (${MCP_LIMIT.CallsPerTokenPerDay})`,
} as const;
