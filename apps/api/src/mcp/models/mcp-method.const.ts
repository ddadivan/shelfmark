/** The JSON-RPC methods the MCP server implements (anything else is `-32601`). */
export const MCP_METHOD = {
  Initialize: 'initialize',
  Ping: 'ping',
  ToolsList: 'tools/list',
  ToolsCall: 'tools/call',
} as const;
