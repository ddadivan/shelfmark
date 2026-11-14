import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SAVED_VIEW_SCOPE } from '@shelfmark/contracts';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { HttpSavedViewsApi } from './http-saved-views.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpSavedViewsApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpSavedViewsApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists, creates, updates, deletes and reorders under /api/views, without the global toast', () => {
    const { api, http } = setup();
    const query = { scope: SAVED_VIEW_SCOPE.All };

    api.list().subscribe();
    const list = http.expectOne('/api/views');
    expect(list.request.method).toBe('GET');
    expect(list.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    list.flush({ items: [], total: 0 });

    api.create({ name: 'Mine', query }).subscribe();
    const create = http.expectOne('/api/views');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ name: 'Mine', query });
    create.flush({});

    api.update('a/b', { name: 'New' }).subscribe();
    const update = http.expectOne('/api/views/a%2Fb');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ name: 'New' });
    update.flush({});

    api.remove('x').subscribe();
    const remove = http.expectOne('/api/views/x');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);

    api.reorder(['b', 'a']).subscribe();
    const reorder = http.expectOne('/api/views/order');
    expect(reorder.request.method).toBe('PUT');
    expect(reorder.request.body).toEqual({ ids: ['b', 'a'] });
    reorder.flush({ items: [], total: 0 });
  });
});
