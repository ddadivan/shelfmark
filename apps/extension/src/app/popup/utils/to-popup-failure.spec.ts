import { HttpErrorResponse } from '@angular/common/http';
import { LINK_ERROR_MESSAGE } from '@shelfmark/contracts';
import { POPUP_ERROR } from '../models/popup-error.const';
import { POPUP_STEP } from '../models/popup-step.const';
import { toPopupFailure } from './to-popup-failure';

const http = (status: number, message?: string): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: message === undefined ? null : { message } });

describe('toPopupFailure', () => {
  it('answers signedOut for a 401', () => {
    expect(toPopupFailure(http(401), POPUP_STEP.Load)).toBe('signedOut');
  });

  it('reports offline for status 0, retryable', () => {
    expect(toPopupFailure(http(0), POPUP_STEP.Load)).toEqual({
      error: POPUP_ERROR.Offline,
      step: POPUP_STEP.Load,
      retryable: true,
    });
  });

  it('reports the rate limit for a 429, retryable', () => {
    expect(toPopupFailure(http(429), POPUP_STEP.Save)).toEqual({
      error: POPUP_ERROR.RateLimit,
      step: POPUP_STEP.Save,
      retryable: true,
    });
  });

  it('reports the demo limit, not retryable', () => {
    expect(toPopupFailure(http(403, LINK_ERROR_MESSAGE.DemoLimitReached), POPUP_STEP.Save)).toEqual(
      { error: POPUP_ERROR.DemoLimit, step: POPUP_STEP.Save, retryable: false },
    );
  });

  it('reports the normal limit, not retryable', () => {
    expect(toPopupFailure(http(403, LINK_ERROR_MESSAGE.LimitReached), POPUP_STEP.Save)).toEqual({
      error: POPUP_ERROR.Limit,
      step: POPUP_STEP.Save,
      retryable: false,
    });
  });

  it.each([
    ['an unknown message', http(500, 'boom')],
    ['a body without a message', http(500)],
    ['a non-string message', new HttpErrorResponse({ status: 500, error: { message: 5 } })],
    ['a string body', new HttpErrorResponse({ status: 500, error: 'oops' })],
  ])('reports a retryable server error for %s', (_name, error) => {
    expect(toPopupFailure(error, POPUP_STEP.Load)).toEqual({
      error: POPUP_ERROR.Server,
      step: POPUP_STEP.Load,
      retryable: true,
    });
  });

  it('reports a retryable server error for a non-Http error', () => {
    expect(toPopupFailure(new Error('x'), POPUP_STEP.Save)).toEqual({
      error: POPUP_ERROR.Server,
      step: POPUP_STEP.Save,
      retryable: true,
    });
  });
});
