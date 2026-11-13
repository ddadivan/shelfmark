import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { SendFeedbackRequest } from '@shelfmark/contracts';
import { feedbackMessage } from '../../../../testing/feedback-message';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { FeedbackSendError } from '../utils/feedback-send-error';
import { FEEDBACK_SEND_ERROR_REASON } from '../models/feedback-send-error-reason.const';
import { HttpFeedbackApi } from './http-feedback.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpFeedbackApi), http: TestBed.inject(HttpTestingController) };
}

const REQUEST: SendFeedbackRequest = {
  kind: 'problem',
  text: 'Preview is missing',
  client: { appVersion: '1.0', userAgent: 'Test' },
};

describe('HttpFeedbackApi', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lists the messages with GET /api/feedback/messages, without the error toast', async () => {
    const { api, http } = setup();

    const result = api.list();
    const request = http.expectOne('/api/feedback/messages');
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    request.flush({ items: [feedbackMessage()] });

    await expect(result).resolves.toEqual([feedbackMessage()]);
  });

  it('sends with POST /api/feedback/messages and the body as given', async () => {
    const { api, http } = setup();

    const result = api.send(REQUEST);
    const request = http.expectOne('/api/feedback/messages');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(REQUEST);
    expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    request.flush(feedbackMessage());

    await expect(result).resolves.toEqual(feedbackMessage());
  });

  it('maps a 429 to FeedbackSendError(RateLimited)', async () => {
    const { api, http } = setup();

    const result = api.send(REQUEST);
    http
      .expectOne('/api/feedback/messages')
      .flush({}, { status: 429, statusText: 'Too Many Requests' });

    await expect(result).rejects.toEqual(
      new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.RateLimited),
    );
  });

  it.each([400, 500])('maps a %s to FeedbackSendError(Failed)', async (status) => {
    const { api, http } = setup();

    const result = api.send(REQUEST);
    http.expectOne('/api/feedback/messages').flush({}, { status, statusText: 'Error' });

    await expect(result).rejects.toEqual(new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.Failed));
  });

  it('attaches a screenshot with POST to its own route, without the error toast', async () => {
    const { api, http } = setup();
    const upload = { type: 'image/png' as const, data: 'aGVsbG8=' };

    const result = api.attachScreenshot('m1', upload);
    const request = http.expectOne('/api/feedback/messages/m1/screenshots');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(upload);
    expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    request.flush(feedbackMessage({ screenshotUrls: ['/api/feedback/messages/m1/screenshots/0'] }));

    await expect(result).resolves.toMatchObject({
      screenshotUrls: ['/api/feedback/messages/m1/screenshots/0'],
    });
  });

  it('rejects a failed screenshot with the HTTP error as is', async () => {
    const { api, http } = setup();

    const result = api.attachScreenshot('m1', { type: 'image/png', data: 'aGVsbG8=' });
    http
      .expectOne('/api/feedback/messages/m1/screenshots')
      .flush(
        { message: 'A message has at most 3 screenshots' },
        { status: 400, statusText: 'Bad' },
      );

    await expect(result).rejects.toMatchObject({ status: 400 });
  });
});
