import { Injectable } from '@nestjs/common';
import type { McpMeaningSearch } from '../models/mcp-meaning-search.interface';

/**
 * AI-3 seam: search by meaning is not on this branch, so `search_links` returns word matches only.
 * AI-3 replaces this provider (`MCP_MEANING_SEARCH` in `McpModule`) with its meaning search service.
 */
@Injectable()
export class NoMeaningSearch implements McpMeaningSearch {
  find(): Promise<string[]> {
    return Promise.resolve([]);
  }
}
