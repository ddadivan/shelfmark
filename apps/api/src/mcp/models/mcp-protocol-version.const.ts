/**
 * MCP protocol revisions the server speaks, newest first (ADR 0054). `initialize` answers the
 * client's version when listed, else the newest; a present `MCP-Protocol-Version` header outside the
 * list is a 400. Re-checked against the specification and the SDK on 2026-11-17 (newest: 2025-11-25).
 * `2025-03-26` is not listed: it requires JSON-RPC batches, which this server refuses.
 */
export const MCP_PROTOCOL_VERSIONS: readonly string[] = ['2025-11-25', '2025-06-18'];
