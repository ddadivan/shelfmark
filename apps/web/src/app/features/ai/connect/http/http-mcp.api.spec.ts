import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpMcpApi } from './http-mcp.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpMcpApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpMcpApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists, creates and revokes personal tokens', () => {
    const { api, http } = setup();

    api.list().subscribe();
    expect(http.expectOne('/api/mcp/tokens').request.method).toBe('GET');

    api.create({ name: 'Claude Desktop', includeNotes: true }).subscribe();
    const create = http.expectOne('/api/mcp/tokens');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ name: 'Claude Desktop', includeNotes: true });

    api.revoke('a/b').subscribe();
    expect(http.expectOne('/api/mcp/tokens/a%2Fb').request.method).toBe('DELETE');
  });
});
