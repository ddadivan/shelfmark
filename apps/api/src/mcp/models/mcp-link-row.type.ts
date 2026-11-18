import type { Prisma } from '../../generated/prisma/client';
import type { MCP_LINK_SELECT } from './mcp-link-select.const';

/** A link row as `MCP_LINK_SELECT` reads it. */
export type McpLinkRow = Prisma.LinkGetPayload<{ select: typeof MCP_LINK_SELECT }>;
