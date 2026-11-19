import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { IMPORT_SOURCE, type ImportLinksRequest } from '@shelfmark/contracts';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { HttpImportApi } from './http-import.api';

describe('HttpImportApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('calls every route of the endpoint table with its method and body, without the global toast', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(HttpImportApi);
    const http = TestBed.inject(HttpTestingController);
    const start = {
      source: IMPORT_SOURCE.Browser,
      fileName: 'bookmarks.html',
      newFolderName: 'Imported',
      folders: [{ key: 'f1', parentKey: null, name: 'Docs' }],
    };
    const links: ImportLinksRequest = {
      items: [{ url: 'https://a.example/', idempotencyKey: 'k1' }],
      skipRepeats: false,
    };
    const calls: Array<[() => void, string, string, unknown]> = [
      [() => api.list().subscribe(), 'GET', '/api/imports', null],
      [
        () => api.check(['https://a.example/']).subscribe(),
        'POST',
        '/api/imports/check',
        { urls: ['https://a.example/'] },
      ],
      [() => api.start(start).subscribe(), 'POST', '/api/imports', start],
      [() => api.addLinks('i1', links).subscribe(), 'POST', '/api/imports/i1/links', links],
      [
        () => api.finish('i1', { skipped: 2, failed: 1 }).subscribe(),
        'POST',
        '/api/imports/i1/finish',
        { skipped: 2, failed: 1 },
      ],
      [() => api.undo('i1').subscribe(), 'POST', '/api/imports/i1/undo', {}],
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

  it('encodes the import id in the path', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(HttpImportApi).undo('a/b').subscribe();

    TestBed.inject(HttpTestingController).expectOne('/api/imports/a%2Fb/undo').flush({});
  });
});
