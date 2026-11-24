/**
 * What a personal MCP token may do (Shelf 15-tools "Access"): `read` searches and reads the
 * links; `save` may also save new links when the server offers a save tool. The server has no
 * write tool yet, so today both work the same; a future save tool must check for `save`.
 * Fixed at creation.
 */
export const MCP_TOKEN_ACCESS = {
  Read: 'read',
  Save: 'save',
} as const;
