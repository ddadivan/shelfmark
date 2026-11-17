import { MCP_CLIENT } from '../models/mcp-client.const';
import { mcpClientSetup } from './mcp-client-setup';

const URL = 'https://shelfmark.example/api/mcp';

describe('mcpClientSetup', () => {
  it('gives the Claude Code command with the address and the token placeholder', () => {
    expect(mcpClientSetup(MCP_CLIENT.ClaudeCode, URL)).toBe(
      `claude mcp add --transport http shelfmark ${URL} --header "Authorization: Bearer <token>"`,
    );
  });

  it('gives Claude Desktop the mcp-remote bridge', () => {
    expect(JSON.parse(mcpClientSetup(MCP_CLIENT.ClaudeDesktop, URL))).toEqual({
      mcpServers: {
        shelfmark: {
          command: 'npx',
          args: ['-y', 'mcp-remote', URL, '--header', 'Authorization: Bearer <token>'],
        },
      },
    });
  });

  it('gives Cursor and VS Code their mcp.json with the header', () => {
    const headers = { Authorization: 'Bearer <token>' };
    expect(JSON.parse(mcpClientSetup(MCP_CLIENT.Cursor, URL))).toEqual({
      mcpServers: { shelfmark: { url: URL, headers } },
    });
    expect(JSON.parse(mcpClientSetup(MCP_CLIENT.VsCode, URL))).toEqual({
      servers: { shelfmark: { type: 'http', url: URL, headers } },
    });
  });
});
