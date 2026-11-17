import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { POPUP_ERROR } from '../../popup/models/popup-error.const';
import { POPUP_STEP } from '../../popup/models/popup-step.const';
import { toPopupFailure } from '../../popup/utils/to-popup-failure';
import { REQUEST_TIMEOUT_MS } from './models/request-timeout-ms.const';
import { REQUEST_TIMEOUT } from './request-timeout.token';
import { timeoutInterceptor } from './timeout.interceptor';

const URL = 'https://shelfmark.example/api/folders';
const SHORT_MS = 20;

describe('timeoutInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([timeoutInterceptor])),
        provideHttpClientTesting(),
        { provide: REQUEST_TIMEOUT, useValue: SHORT_MS },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('waits 15 seconds in the app', () => {
    TestBed.resetTestingModule();
    expect(TestBed.inject(REQUEST_TIMEOUT)).toBe(REQUEST_TIMEOUT_MS);
    expect(REQUEST_TIMEOUT_MS).toBe(15_000);
  });

  it('passes an answer that comes in time', async () => {
    const answer = firstValueFrom(http.get<{ ok: boolean }>(URL));

    backend.expectOne(URL).flush({ ok: true });

    await expect(answer).resolves.toEqual({ ok: true });
  });

  it('gives up after the limit with a status 0 error, the offline screen of the popup', async () => {
    const answer = firstValueFrom(http.get(URL)).catch((error: unknown) => error);
    const request = backend.expectOne(URL);

    const failure = await answer;

    expect(request.cancelled).toBe(true);
    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect((failure as HttpErrorResponse).status).toBe(0);
    expect(toPopupFailure(failure, POPUP_STEP.Save)).toEqual({
      error: POPUP_ERROR.Offline,
      step: POPUP_STEP.Save,
      retryable: true,
    });
  });
});
