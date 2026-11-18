import { MCP_TOOL_CALL_KIND } from '../models/mcp-tool-call-kind.const';
import type { McpParseResult } from '../models/mcp-parse-result.type';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A refused argument set; the message is fixed text that never repeats the input. */
export function invalidArgs<T>(message: string): McpParseResult<T> {
  return { kind: MCP_TOOL_CALL_KIND.Invalid, message };
}

/** Accepted, narrowed arguments. */
export function validArgs<T>(value: T): McpParseResult<T> {
  return { kind: MCP_TOOL_CALL_KIND.Ok, value };
}

/** Whether every key of the arguments is one of `allowed` (unknown keys are refused). */
export function hasOnlyKeys(args: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(args).every((key) => allowed.includes(key));
}

/** A UUID in canonical text form (any version), as the ids of links and folders are. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
