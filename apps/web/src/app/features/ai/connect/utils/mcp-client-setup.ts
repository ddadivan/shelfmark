import { MCP_CLIENT } from '../models/mcp-client.const';
import type { McpClient } from '../models/mcp-client.type';
import { MCP_TOKEN_PLACEHOLDER } from '../models/mcp-token-placeholder.const';

/** The name the server gets in every client's configuration. */
const SERVER_NAME = 'shelfmark';

const authorization = `Bearer ${MCP_TOKEN_PLACEHOLDER}`;

/**
 * The setup of one assistant for the Shelfmark MCP server at `url`, with `<token>` where the
 * personal token goes: the Claude Code command, the Claude Desktop config entry (through the
 * `mcp-remote` bridge, Claude Desktop has no header setting), the Cursor and VS Code `mcp.json`.
 * Code, not UI text: it stays the same in every language.
 */
export function mcpClientSetup(client: McpClient, url: string): string {
  switch (client) {
    case MCP_CLIENT.ClaudeCode:
      return `claude mcp add --transport http ${SERVER_NAME} ${url} --header "Authorization: ${authorization}"`;
    case MCP_CLIENT.ClaudeDesktop:
      return json({
        mcpServers: {
          [SERVER_NAME]: {
            command: 'npx',
            args: ['-y', 'mcp-remote', url, '--header', `Authorization: ${authorization}`],
          },
        },
      });
    case MCP_CLIENT.Cursor:
      return json({
        mcpServers: { [SERVER_NAME]: { url, headers: { Authorization: authorization } } },
      });
    case MCP_CLIENT.VsCode:
      return json({
        servers: {
          [SERVER_NAME]: { type: 'http', url, headers: { Authorization: authorization } },
        },
      });
  }
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
