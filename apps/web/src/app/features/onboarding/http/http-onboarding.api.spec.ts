import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpOnboardingApi } from './http-onboarding.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpOnboardingApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpOnboardingApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('completes with POST /api/me/onboarding and returns the server time', async () => {
    const { api, http } = setup();

    const result = api.complete();
    const request = http.expectOne('/api/me/onboarding');
    expect(request.request.method).toBe('POST');
    request.flush({ onboardingCompletedAt: '2026-03-03T10:00:00.000Z' });

    await expect(result).resolves.toEqual({ onboardingCompletedAt: '2026-03-03T10:00:00.000Z' });
  });

  it('resets with DELETE /api/me/onboarding', async () => {
    const { api, http } = setup();

    const result = api.reset();
    const request = http.expectOne('/api/me/onboarding');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(result).resolves.toBeUndefined();
  });

  it('rejects when the server fails', async () => {
    const { api, http } = setup();

    const result = api.complete();
    http.expectOne('/api/me/onboarding').flush(null, { status: 500, statusText: 'Error' });

    await expect(result).rejects.toBeDefined();
  });
});
