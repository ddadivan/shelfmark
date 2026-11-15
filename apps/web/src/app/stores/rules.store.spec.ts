import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { RULE_ERROR_MESSAGE, RULE_LIMIT, type RuleResponse } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { mockHttpError } from '../core/api/mock-http-error';
import { SessionScope } from '../core/auth/session-scope.service';
import { RULES_API } from '../features/rules/models/rules-api.const';
import type { RulesApi } from '../features/rules/models/rules-api.interface';
import { RULE_OUTCOME } from './models/rule-outcome.const';
import { RulesStore } from './rules.store';

function rule(domain: string, fields: Partial<RuleResponse> = {}): RuleResponse {
  return {
    id: domain,
    domain,
    folderId: null,
    folderAvailable: true,
    tags: ['x'],
    createdAt: '2026-11-01T00:00:00.000Z',
    ...fields,
  };
}

function setup(items: RuleResponse[] = [rule('youtube.com'), rule('vimeo.com')]) {
  const api = {
    list: vi.fn<RulesApi['list']>(() => of({ items })),
    create: vi.fn<RulesApi['create']>((request) => of(rule(request.domain))),
    update: vi.fn<RulesApi['update']>((id, request) => of({ ...rule(request.domain ?? id), id })),
    remove: vi.fn<RulesApi['remove']>(() => of(undefined)),
    matches: vi.fn<RulesApi['matches']>(() => of({ items: [], total: 0 })),
  };
  TestBed.configureTestingModule({ providers: [{ provide: RULES_API, useValue: api }] });
  return { api, store: TestBed.inject(RulesStore) };
}

const domains = (store: InstanceType<typeof RulesStore>) =>
  store.items().map((item) => item.domain);

describe('RulesStore', () => {
  it('loads once and matches a URL with the most specific rule', async () => {
    const { api, store } = setup([rule('youtube.com'), rule('music.youtube.com')]);
    expect(store.matchFor('https://music.youtube.com/a')).toBeNull();
    await Promise.all([store.load(), store.load()]);
    await store.load();
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(store.matchFor('https://music.youtube.com/a')?.domain).toBe('music.youtube.com');
    expect(store.matchFor('https://www.youtube.com/a')?.domain).toBe('youtube.com');
    expect(store.matchFor('https://example.com')).toBeNull();
  });

  it('flags a failed first load and loads again on the next call', async () => {
    const { api, store } = setup();
    api.list.mockReturnValueOnce(throwError(() => new Error('down')));
    await store.load();
    expect(store.error()).toBe(true);
    await store.load();
    expect(store.loaded()).toBe(true);
    expect(store.error()).toBe(false);
  });

  it('creates and edits, keeping the list sorted by domain', async () => {
    const { store } = setup();
    await store.load();
    expect((await store.create({ domain: 'arxiv.org', tags: ['paper'] })).outcome).toBe(
      RULE_OUTCOME.Done,
    );
    expect(domains(store)).toEqual(['arxiv.org', 'vimeo.com', 'youtube.com']);
    await store.update('vimeo.com', { domain: 'zoom.us' });
    expect(domains(store)).toEqual(['arxiv.org', 'youtube.com', 'zoom.us']);
  });

  it('maps the refusals of the API to outcomes', async () => {
    const { api, store } = setup();
    await store.load();
    const refuse = (status: number, message: string) =>
      api.create.mockReturnValueOnce(throwError(() => mockHttpError(status, message)));
    refuse(HttpStatusCode.Conflict, RULE_ERROR_MESSAGE.DomainTaken);
    expect((await store.create({ domain: 'a.com', tags: ['x'] })).outcome).toBe(RULE_OUTCOME.Taken);
    refuse(HttpStatusCode.Conflict, RULE_ERROR_MESSAGE.LimitReached);
    expect((await store.create({ domain: 'a.com', tags: ['x'] })).outcome).toBe(RULE_OUTCOME.Limit);
    refuse(HttpStatusCode.NotFound, RULE_ERROR_MESSAGE.FolderNotFound);
    expect((await store.create({ domain: 'a.com', folderId: 'f' })).outcome).toBe(
      RULE_OUTCOME.MissingFolder,
    );
    api.create.mockReturnValueOnce(throwError(() => new Error('down')));
    expect((await store.create({ domain: 'a.com', tags: ['x'] })).outcome).toBe(
      RULE_OUTCOME.Failed,
    );
    api.update.mockReturnValueOnce(
      throwError(() => mockHttpError(HttpStatusCode.NotFound, RULE_ERROR_MESSAGE.NotFound)),
    );
    expect((await store.update('vimeo.com', { tags: ['y'] })).outcome).toBe(RULE_OUTCOME.Missing);
    expect(domains(store)).toEqual(['youtube.com']);
  });

  it('refuses a create at the limit without asking the server', async () => {
    const { api, store } = setup(
      Array.from({ length: RULE_LIMIT.PerUserMax }, (_, index) => rule(`s${index}.example.com`)),
    );
    await store.load();
    expect(store.atLimit()).toBe(true);
    expect((await store.create({ domain: 'a.com', tags: ['x'] })).outcome).toBe(RULE_OUTCOME.Limit);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('hides, puts back and deletes; a rule already gone counts as deleted', async () => {
    const { api, store } = setup();
    await store.load();
    const hidden = store.hide('vimeo.com');
    expect(domains(store)).toEqual(['youtube.com']);
    expect(store.hide('missing')).toBeNull();
    if (hidden) {
      store.putBack(hidden);
    }
    expect(domains(store)).toEqual(['vimeo.com', 'youtube.com']);
    expect(await store.remove('vimeo.com')).toBe(true);
    api.remove.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(await store.remove('gone')).toBe(true);
    api.remove.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    expect(await store.remove('vimeo.com')).toBe(false);
  });

  it('answers the matches, or null when they fail', async () => {
    const { api, store } = setup();
    expect(await store.matches('youtube.com')).toEqual({ items: [], total: 0 });
    api.matches.mockReturnValueOnce(throwError(() => new Error('down')));
    expect(await store.matches('youtube.com')).toBeNull();
  });

  it('forgets everything when the session ends', async () => {
    const { store } = setup();
    await store.load();
    TestBed.inject(SessionScope).end();
    expect(store.items()).toEqual([]);
    expect(store.loaded()).toBe(false);
  });
});
