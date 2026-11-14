import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { UserSettingsResponse } from '@shelfmark/contracts';
import { HttpUserSettingsApi } from './http-user-settings.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    api: TestBed.inject(HttpUserSettingsApi),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('HttpUserSettingsApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('reads with GET /api/me/settings', () => {
    const { api, http } = setup();
    let settings: UserSettingsResponse | undefined;
    api.get().subscribe((value) => (settings = value));
    const request = http.expectOne('/api/me/settings');
    expect(request.request.method).toBe('GET');
    request.flush({ trashRetentionDays: 90 });
    expect(settings).toEqual({ trashRetentionDays: 90 });
  });

  it('changes with PATCH /api/me/settings and only the given fields', () => {
    const { api, http } = setup();
    let settings: UserSettingsResponse | undefined;
    api.update({ trashRetentionDays: 7 }).subscribe((value) => (settings = value));
    const request = http.expectOne('/api/me/settings');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ trashRetentionDays: 7 });
    request.flush({ trashRetentionDays: 7 });
    expect(settings).toEqual({ trashRetentionDays: 7 });
  });
});
