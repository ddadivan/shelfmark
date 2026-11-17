import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SHELFMARK_ORIGIN } from '../config/shelfmark-origin.const';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('sends credentials to the Shelfmark origin', () => {
    http.get(`${SHELFMARK_ORIGIN}/api/folders`).subscribe();
    expect(backend.expectOne(`${SHELFMARK_ORIGIN}/api/folders`).request.withCredentials).toBe(true);
  });

  it('does not send credentials to another origin', () => {
    http.get('https://other.example/api/folders').subscribe();
    expect(backend.expectOne('https://other.example/api/folders').request.withCredentials).toBe(
      false,
    );
  });

  it('does not send credentials to a lookalike host', () => {
    const url = `${SHELFMARK_ORIGIN}.evil.example/api`;
    http.get(url).subscribe();
    expect(backend.expectOne(url).request.withCredentials).toBe(false);
  });

  it('passes a relative url through untouched', () => {
    http.get('/api/folders').subscribe();
    expect(backend.expectOne('/api/folders').request.withCredentials).toBe(false);
  });
});
