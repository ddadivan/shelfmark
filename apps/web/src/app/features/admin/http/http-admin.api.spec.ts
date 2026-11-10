import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { adminFeedbackMessage } from '../../../../testing/feedback-message';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { HttpAdminApi } from './http-admin.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpAdminApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpAdminApi', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('is an admin when GET /api/admin/status answers 200, without the error toast', async () => {
    const { api, http } = setup();

    const result = api.isAdmin();
    const request = http.expectOne('/api/admin/status');
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    request.flush({ admin: true });

    await expect(result).resolves.toBe(true);
  });

  it.each([404, 401, 500])('is not an admin when the status answers %s', async (status) => {
    const { api, http } = setup();

    const result = api.isAdmin();
    http.expectOne('/api/admin/status').flush({}, { status, statusText: 'No' });

    await expect(result).resolves.toBe(false);
  });

  it('lists with cursor, limit and status as query parameters', async () => {
    const { api, http } = setup();
    const page = { items: [adminFeedbackMessage()], nextCursor: 'c2' };

    const result = api.listFeedback({ cursor: 'c1', limit: 20, status: 'planned' });
    const request = http.expectOne((req) => req.url === '/api/admin/feedback');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('cursor')).toBe('c1');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('status')).toBe('planned');
    request.flush(page);

    await expect(result).resolves.toEqual(page);
  });

  it('sends no query parameters that were not asked for', async () => {
    const { api, http } = setup();

    const result = api.listFeedback({});
    const request = http.expectOne((req) => req.url === '/api/admin/feedback');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ items: [], nextCursor: null });

    await result;
  });

  it('updates with PATCH /api/admin/feedback/:id and the body as given', async () => {
    const { api, http } = setup();
    const saved = adminFeedbackMessage({ status: 'done', reply: null });

    const result = api.updateFeedback('a b', { status: 'done', reply: null });
    const request = http.expectOne('/api/admin/feedback/a%20b');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'done', reply: null });
    request.flush(saved);

    await expect(result).resolves.toEqual(saved);
  });
});
