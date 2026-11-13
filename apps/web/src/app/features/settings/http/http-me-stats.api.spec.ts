import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ME_STATS_ENDPOINT } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { HttpMeStatsApi } from './http-me-stats.api';

describe('HttpMeStatsApi', () => {
  it('GETs /api/me/stats', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(HttpMeStatsApi);
    const http = TestBed.inject(HttpTestingController);

    const answer = firstValueFrom(api.get());
    const request = http.expectOne(ME_STATS_ENDPOINT);
    expect(request.request.method).toBe('GET');
    request.flush({ linkCount: 1 });

    expect(await answer).toEqual({ linkCount: 1 });
    http.verify();
  });

  it('sends the first day of the week when given', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(HttpMeStatsApi);
    const http = TestBed.inject(HttpTestingController);

    const answer = firstValueFrom(api.get({ firstDay: 7 }));
    const request = http.expectOne(`${ME_STATS_ENDPOINT}?firstDay=7`);
    request.flush({ linkCount: 0 });

    expect(await answer).toEqual({ linkCount: 0 });
    http.verify();
  });
});
