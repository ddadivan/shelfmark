import { inject, Service } from '@angular/core';
import {
  AI_SEARCH_LIMIT,
  AI_SEARCH_STATE,
  type AiSearchStatus,
  type LinkResponse,
  type MeaningSearchResponse,
  type RelatedLinksResponse,
} from '@shelfmark/contracts';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { matchesQuery } from '../../links/utils/search-query';
import { MockAiData } from './mock-ai-data';
import { meaningDoc, meaningStems, rankByMeaning, relatedWhy, searchWhy } from './mock-meaning';
import type { MockMeaningDoc } from './models/mock-meaning-doc.interface';
import { MOCK_AI_URL_MARKER } from './models/mock-ai-url-marker.const';

/** The query as the API's DTO normalises it: trimmed, runs of white space collapsed. */
export function normalizeMeaningQuery(q: string): string {
  return q.trim().replace(/\s+/gu, ' ');
}

/**
 * Search by meaning and related links over the mock library (mock builds only), like the API:
 * nothing unless the status is `ready`; a search drops links that are word matches; a related list
 * leaves the link itself out; the "why" lines come from tags, the folder and the summary. A search
 * text with `ai-fail` reads as `unavailable`, with `ai-quota` as `quota`.
 */
@Service()
export class MockAiMeaning {
  private readonly data = inject(MockAiData);
  private readonly library = inject(MockLibraryData);

  /** `GET /api/ai/search` for a valid query (the caller checks length and limit). */
  search(q: string, limit: number): MeaningSearchResponse {
    const query = normalizeMeaningQuery(q);
    const status = this.data.searchStatus();
    if (status.state !== AI_SEARCH_STATE.Ready) {
      return { status, items: [] };
    }
    if (query.includes(MOCK_AI_URL_MARKER.Fail)) {
      return { status: { ...status, state: AI_SEARCH_STATE.Unavailable }, items: [] };
    }
    if (query.includes(MOCK_AI_URL_MARKER.Quota)) {
      return { status: { ...status, state: AI_SEARCH_STATE.Quota }, items: [] };
    }
    const stems = meaningStems(query);
    const docs = this.docs().filter((doc) => !matchesQuery(doc.link, query));
    return {
      status,
      items: rankByMeaning(stems, docs, limit).map(({ doc }) => ({
        link: this.library.linkView(doc.link),
        why: searchWhy(doc, stems),
      })),
    };
  }

  /** `GET /api/links/:id/related`, or `null` for a link that is not the user's (404). */
  related(linkId: string, limit: number): RelatedLinksResponse | null {
    const docs = this.docs();
    const source = docs.find((doc) => doc.link.id === linkId);
    if (!source) {
      return null;
    }
    const status: AiSearchStatus = this.data.searchStatus();
    if (status.state === AI_SEARCH_STATE.Off) {
      return { status, items: [] };
    }
    const others = docs.filter((doc) => doc.link.id !== linkId);
    return {
      status,
      items: rankByMeaning(source.stems, others, limit).map(({ doc }) => ({
        link: this.library.linkView(doc.link),
        why: relatedWhy(doc, source),
      })),
    };
  }

  private docs(): MockMeaningDoc[] {
    const includeNotes = this.data.settings.includeNotes;
    const folders = new Map(this.library.folderList.map((folder) => [folder.id, folder.name]));
    return this.library.links.map((link: LinkResponse) =>
      meaningDoc(
        link,
        link.folderId === null ? null : (folders.get(link.folderId) ?? null),
        includeNotes,
      ),
    );
  }
}

/** The limits of the API's query DTOs: `null` when the request is valid, else the problems. */
export function meaningQueryProblems(
  q: string | undefined,
  limit: number | undefined,
  max: number,
): string[] | null {
  const problems: string[] = [];
  if (q !== undefined) {
    const query = normalizeMeaningQuery(q);
    if (query.length < AI_SEARCH_LIMIT.QueryMinChars || query.length > AI_SEARCH_LIMIT.QueryMax) {
      problems.push('q is invalid');
    }
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > max)) {
    problems.push('limit is invalid');
  }
  return problems.length > 0 ? problems : null;
}
