import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { HttpAccountDeletionApi } from './http-account-deletion.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    api: TestBed.inject(HttpAccountDeletionApi),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('HttpAccountDeletionApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('sends DELETE /api/me with the email and opts out of the error toast', async () => {
    const { api, http } = setup();

    const result = api.delete({ email: 'ada@example.com' });
    const request = http.expectOne('/api/me');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ email: 'ada@example.com' });
    expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(result).resolves.toBeUndefined();
  });

  it('rejects with the HTTP error', async () => {
    const { api, http } = setup();

    const result = api.delete({ email: 'ada@example.com' });
    http.expectOne('/api/me').flush(null, { status: 400, statusText: 'Bad Request' });

    await expect(result).rejects.toMatchObject({ status: 400 });
  });
});
