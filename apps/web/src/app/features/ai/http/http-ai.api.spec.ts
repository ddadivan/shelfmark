import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AI_APPLIED_PART } from '@shelfmark/contracts';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { HttpAiApi } from './http-ai.api';

describe('HttpAiApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function setup(): { api: HttpAiApi; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { api: TestBed.inject(HttpAiApi), http: TestBed.inject(HttpTestingController) };
  }

  it('calls every route of the endpoint table with its method, without the global toast', () => {
    const { api, http } = setup();
    const calls: Array<[() => void, string, string, unknown]> = [
      [() => api.getSettings().subscribe(), 'GET', '/api/ai/settings', null],
      [
        () => api.updateSettings({ enabled: true }).subscribe(),
        'PATCH',
        '/api/ai/settings',
        { enabled: true },
      ],
      [
        () => api.createDraft({ draftId: 'd1', url: 'https://a.example' }).subscribe(),
        'POST',
        '/api/ai/drafts',
        { draftId: 'd1', url: 'https://a.example' },
      ],
      [() => api.getJob('j/1').subscribe(), 'GET', '/api/ai/jobs/j%2F1', null],
      [
        () => api.dismissSuggestion('s1').subscribe(),
        'POST',
        '/api/ai/suggestions/s1/dismiss',
        null,
      ],
      [() => api.getBackfill().subscribe(), 'GET', '/api/ai/backfill', null],
      [() => api.startBackfill().subscribe(), 'POST', '/api/ai/backfill', null],
      [() => api.stopBackfill().subscribe(), 'DELETE', '/api/ai/backfill', null],
      [() => api.tick().subscribe(), 'POST', '/api/ai/tick', null],
      [() => api.deleteData().subscribe(), 'DELETE', '/api/ai/data', null],
      [() => api.getTidy().subscribe(), 'GET', '/api/ai/tidy', null],
      [() => api.getTidy('l9').subscribe(), 'GET', '/api/ai/tidy?after=l9', null],
      [() => api.getTidyCount().subscribe(), 'GET', '/api/ai/tidy/count', null],
      [
        () => api.applyTidy({ items: [{ linkId: 'l1', suggestionIds: ['s1'] }] }).subscribe(),
        'POST',
        '/api/ai/tidy/apply',
        { items: [{ linkId: 'l1', suggestionIds: ['s1'] }] },
      ],
      [
        () =>
          api
            .undoTidy({ items: [{ linkId: 'l1', folderId: 'f1', tags: [], suggestionIds: [] }] })
            .subscribe(),
        'POST',
        '/api/ai/tidy/undo',
        { items: [{ linkId: 'l1', folderId: 'f1', tags: [], suggestionIds: [] }] },
      ],
      [() => api.getLinkAi('l1').subscribe(), 'GET', '/api/links/l1/ai', null],
      [() => api.rewriteSummary('l1').subscribe(), 'POST', '/api/links/l1/ai/rewrite', null],
      [
        () => api.undoApply('l1', { part: AI_APPLIED_PART.Folder }).subscribe(),
        'POST',
        '/api/links/l1/ai/undo',
        { part: 'folder' },
      ],
    ];
    for (const [call, method, url, body] of calls) {
      call();
      const request = http.expectOne(url);
      expect(request.request.method).toBe(method);
      expect(request.request.body).toEqual(body);
      expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
      request.flush({});
    }
  });
});
