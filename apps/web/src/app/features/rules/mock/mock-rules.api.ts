import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  hostMatchesDomain,
  LINK_LIMIT,
  normalizeRuleDomain,
  normalizeTagName,
  RULE_ERROR_MESSAGE,
  RULE_LIMIT,
  ruleHost,
  TAG_LIMIT,
  type CreateRuleRequest,
  type ListRulesResponse,
  type RuleMatchesResponse,
  type RuleResponse,
  type UpdateRuleRequest,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { RulesApi } from '../models/rules-api.interface';
import type { MockRule } from './models/mock-rule.interface';

function failure(status: number, message?: string | string[]): Observable<never> {
  return throwError(() => mockHttpError(status, message));
}

/** Tag names like the API's DTO: normalised, blank ones dropped, unique ignoring case, in order. */
function ruleTags(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of names) {
    const name = normalizeTagName(raw);
    if (name !== '' && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      tags.push(name);
    }
  }
  return tags;
}

/** A domain whose rule fails to save (e2e and manual checks of the error path). */
const FAILING_DOMAIN = 'save-fails.example';

/**
 * `RulesApi` over the shared in-memory library, with simulated latency. Like the real API: the
 * domain is normalised (400 when there is none), one rule per domain (409), a rule needs a folder
 * or a tag (400), at most `RULE_LIMIT.PerUserMax` rules (409), a folder must be live (404); the
 * list is sorted by domain; matches are the links in Unsorted whose host matches, newest first.
 */
@Service()
export class MockRulesApi implements RulesApi {
  private readonly data = inject(MockLibraryData);

  list(): Observable<ListRulesResponse> {
    return defer(() => of({ items: this.sorted().map((rule) => this.view(rule)) })).pipe(
      delay(MOCK_LATENCY_MS.List),
    );
  }

  create(request: CreateRuleRequest): Observable<RuleResponse> {
    return defer(() => {
      const domain = normalizeRuleDomain(request.domain);
      const tags = ruleTags(request.tags ?? []);
      const folderId = request.folderId ?? null;
      const refused = this.refuse(domain, folderId, tags, null, folderId !== null);
      if (refused) {
        return refused;
      }
      if (this.data.rules.length >= RULE_LIMIT.PerUserMax) {
        return failure(HttpStatusCode.Conflict, RULE_ERROR_MESSAGE.LimitReached);
      }
      const rule: MockRule = {
        id: globalThis.crypto.randomUUID(),
        domain: domain ?? '',
        folderId,
        tags,
        createdAt: new Date().toISOString(),
      };
      this.data.rules = [...this.data.rules, rule];
      return of(this.view(rule));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  update(id: string, request: UpdateRuleRequest): Observable<RuleResponse> {
    return defer(() => {
      const current = this.data.rules.find((rule) => rule.id === id);
      if (!current) {
        return failure(HttpStatusCode.NotFound, RULE_ERROR_MESSAGE.NotFound);
      }
      const domain =
        request.domain === undefined ? current.domain : normalizeRuleDomain(request.domain);
      const folderId =
        request.folderId === undefined ? this.data.ruleFolderId(current) : request.folderId;
      const tags = request.tags === undefined ? current.tags : ruleTags(request.tags);
      const newFolder = folderId !== null && folderId !== current.folderId;
      const refused = this.refuse(domain, folderId, tags, id, newFolder);
      if (refused) {
        return refused;
      }
      const next: MockRule = { ...current, domain: domain ?? current.domain, folderId, tags };
      this.data.rules = this.data.rules.map((rule) => (rule.id === id ? next : rule));
      return of(this.view(next));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  remove(id: string): Observable<void> {
    return defer(() => {
      if (!this.data.rules.some((rule) => rule.id === id)) {
        return failure(HttpStatusCode.NotFound, RULE_ERROR_MESSAGE.NotFound);
      }
      this.data.rules = this.data.rules.filter((rule) => rule.id !== id);
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  matches(id: string): Observable<RuleMatchesResponse> {
    return defer(() => {
      const rule = this.data.rules.find((item) => item.id === id);
      if (!rule) {
        return failure(HttpStatusCode.NotFound, RULE_ERROR_MESSAGE.NotFound);
      }
      const matching = this.data.links
        .filter((link) => {
          const host = ruleHost(link.url);
          return link.folderId === null && host !== null && hostMatchesDomain(host, rule.domain);
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
      return of({
        total: matching.length,
        items: matching
          .slice(0, LINK_LIMIT.BatchMax)
          .map((link) => ({ id: link.id, tags: [...link.tags] })),
      });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  /** The error the API would answer for these values, or `null`. */
  private refuse(
    domain: string | null,
    folderId: string | null,
    tags: readonly string[],
    ownId: string | null,
    checkFolder: boolean,
  ): Observable<never> | null {
    if (domain === null) {
      return failure(HttpStatusCode.BadRequest, [RULE_ERROR_MESSAGE.InvalidDomain]);
    }
    if (domain === FAILING_DOMAIN) {
      return failure(HttpStatusCode.InternalServerError, 'Internal Server Error');
    }
    if (tags.length > RULE_LIMIT.TagsMax || tags.some((tag) => tag.length > TAG_LIMIT.NameMax)) {
      return failure(HttpStatusCode.BadRequest, ['tags are invalid']);
    }
    if (folderId === null && tags.length === 0) {
      return failure(HttpStatusCode.BadRequest, RULE_ERROR_MESSAGE.NothingToDo);
    }
    if (checkFolder && !this.data.folderList.some((folder) => folder.id === folderId)) {
      return failure(HttpStatusCode.NotFound, RULE_ERROR_MESSAGE.FolderNotFound);
    }
    if (this.data.rules.some((rule) => rule.domain === domain && rule.id !== ownId)) {
      return failure(HttpStatusCode.Conflict, RULE_ERROR_MESSAGE.DomainTaken);
    }
    return null;
  }

  private sorted(): MockRule[] {
    return [...this.data.rules].sort((a, b) =>
      a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0,
    );
  }

  private view(rule: MockRule): RuleResponse {
    const folderId = this.data.ruleFolderId(rule);
    return {
      id: rule.id,
      domain: rule.domain,
      folderId,
      folderAvailable:
        folderId === null || this.data.folderList.some((folder) => folder.id === folderId),
      tags: [...rule.tags],
      createdAt: rule.createdAt,
    };
  }
}
