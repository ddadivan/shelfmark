import { InjectionToken } from '@angular/core';
import type { McpApi } from './mcp-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const MCP_API = new InjectionToken<McpApi>('MCP_API');
