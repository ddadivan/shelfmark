import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { HttpRatingApi } from './http-rating.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpRatingApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpRatingApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('reads the due milestone with GET /api/feedback/prompt', async () => {
    const { api, http } = setup();

    const result = api.prompt();
    const request = http.expectOne('/api/feedback/prompt');
    expect(request.request.method).toBe('GET');
    request.flush({ milestone: 'week1' });

    await expect(result).resolves.toBe('week1');
  });

  it('resolves null when nothing is due', async () => {
    const { api, http } = setup();

    const result = api.prompt();
    http.expectOne('/api/feedback/prompt').flush({ milestone: null });

    await expect(result).resolves.toBeNull();
  });

  it('records with POST /api/feedback and the body as given', async () => {
    const { api, http } = setup();

    const result = api.record({ milestone: 'day3', score: 5, comment: 'More tags' });
    const request = http.expectOne('/api/feedback');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ milestone: 'day3', score: 5, comment: 'More tags' });
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(result).resolves.toBeUndefined();
  });

  it('rejects when the server answers an error', async () => {
    const { api, http } = setup();

    const result = api.record({ milestone: 'day3', score: null });
    http.expectOne('/api/feedback').flush(null, { status: 409, statusText: 'Conflict' });

    await expect(result).rejects.toBeDefined();
  });

  it('skips the global error toast on both calls', async () => {
    const { api, http } = setup();

    const prompt = api.prompt();
    const promptRequest = http.expectOne('/api/feedback/prompt');
    expect(promptRequest.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    promptRequest.flush({ milestone: null });
    await prompt;

    const record = api.record({ milestone: 'day3', score: null });
    const recordRequest = http.expectOne('/api/feedback');
    expect(recordRequest.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    recordRequest.flush(null, { status: 204, statusText: 'No Content' });
    await record;
  });
});
