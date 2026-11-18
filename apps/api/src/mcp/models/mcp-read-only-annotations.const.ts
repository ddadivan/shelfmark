/** The annotations of every tool: read-only, nothing destroyed, idempotent, only the user's library. */
export const MCP_READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;
