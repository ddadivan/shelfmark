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
      [() => api.getTidy(undefined, 'i1').subscribe(), 'GET', '/api/ai/tidy?import=i1', null],
      [() => api.getTidy('l9', 'i1').subscribe(), 'GET', '/api/ai/tidy?after=l9&import=i1', null],
      [() => api.getTidyCount().subscribe(), 'GET', '/api/ai/tidy/count', null],
      [() => api.getTidyCount('i1').subscribe(), 'GET', '/api/ai/tidy/count?import=i1', null],
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
      [
        () => api.searchMeaning('warm coat').subscribe(),
        'GET',
        '/api/ai/search?q=warm%20coat',
        null,
      ],
      [
        () => api.searchMeaning('warm coat', 3).subscribe(),
        'GET',
        '/api/ai/search?q=warm%20coat&limit=3',
        null,
      ],
      [() => api.related('l/1').subscribe(), 'GET', '/api/links/l%2F1/related', null],
      [() => api.related('l1', 5).subscribe(), 'GET', '/api/links/l1/related?limit=5', null],
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

  it('asks over fetch with the question and the history as JSON, outside HttpClient', async () => {
    const { api } = setup();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('data: {"type":"text","text":"Hi"}\n\n', { status: 200 }));
    const events = await new Promise<unknown[]>((resolve) => {
      const seen: unknown[] = [];
      api
        .ask('ramen?', [{ question: 'q', answer: 'a [1]', links: [] }])
        .subscribe({ next: (e) => seen.push(e), complete: () => resolve(seen) });
    });
    expect(events).toEqual([{ type: 'text', text: 'Hi' }]);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/ai/ask',
      expect.objectContaining({
        method: 'POST',
        body: '{"question":"ramen?","history":[{"question":"q","answer":"a [1]","links":[]}]}',
      }),
    );
    fetchSpy.mockRestore();
  });
});
