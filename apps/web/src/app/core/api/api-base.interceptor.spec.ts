import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiBaseInterceptor } from './api-base.interceptor';

describe('apiBaseInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiBaseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  function credentialsOf(url: string): boolean {
    http.get(url).subscribe();
    const request = controller.expectOne(url);
    request.flush({});
    return request.request.withCredentials;
  }

  it.each(['/api/links', '/api', '/api/links?q=a', `${globalThis.location.origin}/api/health`])(
    'sends cookies to our own API: %s',
    (url) => {
      expect(credentialsOf(url)).toBe(true);
    },
  );

  it.each([
    'https://evil.test/api/links',
    '//evil.test/api/links',
    '/apiary/links',
    '/assets/en.json',
  ])('does not send cookies to %s', (url) => {
    expect(credentialsOf(url)).toBe(false);
  });
});
