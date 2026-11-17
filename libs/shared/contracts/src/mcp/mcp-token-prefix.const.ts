/**
 * The visible prefix of every personal MCP token (ADR 0053): it tells a person what the value is and
 * lets secret scanners (the gitleaks rule, a GitHub custom pattern) find a leaked token.
 */
export const MCP_TOKEN_PREFIX = 'smk_live_';
