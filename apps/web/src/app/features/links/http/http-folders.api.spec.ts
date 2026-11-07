import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FOLDER_DELETE_MODE, type ListFoldersResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_ID, MOCK_LIBRARY_COUNTS } from '@shelfmark/contracts/testing';
import { HttpFoldersApi } from './http-folders.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpFoldersApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpFoldersApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists folders with the counts', () => {
    const { api, http } = setup();
    const body: ListFoldersResponse = { items: [...MOCK_FOLDERS], counts: MOCK_LIBRARY_COUNTS };
    let result: ListFoldersResponse | undefined;

    api.list().subscribe((response) => (result = response));
    const request = http.expectOne('/api/folders');
    expect(request.request.method).toBe('GET');
    request.flush(body);

    expect(result).toEqual(body);
  });

  it('creates a folder with its parent', () => {
    const { api, http } = setup();

    api.create({ name: 'Work', parentId: MOCK_ID.FolderReading }).subscribe();
    const request = http.expectOne('/api/folders');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Work', parentId: MOCK_ID.FolderReading });
    request.flush(MOCK_FOLDERS[0]);
  });

  it('renames and moves with PATCH', () => {
    const { api, http } = setup();

    api.update(MOCK_ID.FolderAngular, { name: 'NG', parentId: null }).subscribe();
    const request = http.expectOne(`/api/folders/${MOCK_ID.FolderAngular}`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'NG', parentId: null });
    request.flush(MOCK_FOLDERS[1]);
  });

  it('deletes with the mode in the query', () => {
    const { api, http } = setup();

    api.remove(MOCK_ID.FolderReading, FOLDER_DELETE_MODE.DeleteLinks).subscribe();
    const request = http.expectOne(
      (candidate) => candidate.url === `/api/folders/${MOCK_ID.FolderReading}`,
    );

    expect(request.request.method).toBe('DELETE');
    expect(request.request.params.get('mode')).toBe('delete-links');
    request.flush(null);
  });

  it('encodes the id in the path', () => {
    const { api, http } = setup();

    api.update('a/b', { name: 'x' }).subscribe();

    http.expectOne('/api/folders/a%2Fb').flush(MOCK_FOLDERS[0]);
  });
});
