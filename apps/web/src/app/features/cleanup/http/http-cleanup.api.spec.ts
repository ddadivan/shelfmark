import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { HttpCleanupApi } from './http-cleanup.api';

describe('HttpCleanupApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('calls every route of the endpoint table with its method, without the global toast', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(HttpCleanupApi);
    const http = TestBed.inject(HttpTestingController);
    const apply = { duplicates: [{ groupId: 'g1', trashIds: ['l2'] }], tagMerges: [] };
    const undo = { runId: '0196a1b2-0000-7000-8000-000000000001' };
    const calls: Array<[() => void, string, string, unknown]> = [
      [() => api.getReport().subscribe(), 'GET', '/api/cleanup', null],
      [
        () => api.run({ includeAi: true }).subscribe(),
        'POST',
        '/api/cleanup/run',
        { includeAi: true },
      ],
      [() => api.apply(apply).subscribe(), 'POST', '/api/cleanup/apply', apply],
      [() => api.undo(undo).subscribe(), 'POST', '/api/cleanup/undo', undo],
      [() => api.getSummary().subscribe(), 'GET', '/api/cleanup/summary', null],
      [() => api.dismissCard().subscribe(), 'POST', '/api/cleanup/card/dismiss', {}],
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
