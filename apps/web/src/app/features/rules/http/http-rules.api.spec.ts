import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { HttpRulesApi } from './http-rules.api';

describe('HttpRulesApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists, creates, updates, deletes and reads matches under /api/rules, without the global toast', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(HttpRulesApi);
    const http = TestBed.inject(HttpTestingController);

    api.list().subscribe();
    const list = http.expectOne('/api/rules');
    expect(list.request.method).toBe('GET');
    expect(list.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    list.flush({ items: [] });

    api.create({ domain: 'youtube.com', tags: ['video'] }).subscribe();
    const create = http.expectOne('/api/rules');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ domain: 'youtube.com', tags: ['video'] });
    create.flush({});

    api.update('a/b', { folderId: null }).subscribe();
    const update = http.expectOne('/api/rules/a%2Fb');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ folderId: null });
    update.flush({});

    api.remove('x').subscribe();
    const remove = http.expectOne('/api/rules/x');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);

    api.matches('x').subscribe();
    const matches = http.expectOne('/api/rules/x/matches');
    expect(matches.request.method).toBe('GET');
    expect(matches.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    matches.flush({ items: [], total: 0 });
  });
});
