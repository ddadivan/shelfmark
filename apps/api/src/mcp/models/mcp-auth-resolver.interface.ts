import type { Request } from 'express';
import type { McpCaller } from './mcp-caller.interface';

/**
 * Turns the credentials of an MCP request into a caller, or `null` when there are none or they are
 * not valid (ADR 0053 point 8). `PersonalTokenResolver` is the only implementation; OAuth through
 * Better Auth can add a second one later without touching the tools. Never reads cookies.
 */
export interface McpAuthResolver {
  resolve(req: Request): Promise<McpCaller | null>;
}
