import { HttpErrorResponse } from '@angular/common/http';
import { TAG_ERROR_MESSAGE, type ApiError } from '@shelfmark/contracts';
import { apiError, hasApiMessage } from './api-error';

const BODY: ApiError = {
  statusCode: 409,
  error: 'Conflict',
  message: TAG_ERROR_MESSAGE.LimitReached,
  requestId: 'r1',
};

function failure(body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status: 409, error: body });
}

describe('apiError', () => {
  it('narrows an error response with an API body', () => {
    expect(apiError(failure(BODY))).toEqual(BODY);
    expect(apiError(failure({ ...BODY, message: ['a', 'b'] }))?.message).toEqual(['a', 'b']);
  });

  it.each([
    ['a plain error', new Error('x')],
    ['a string', 'x'],
    ['no body', failure(null)],
    ['a text body', failure('Conflict')],
    ['a body without a request id', failure({ ...BODY, requestId: undefined })],
    ['a numeric message', failure({ ...BODY, message: 3 })],
    ['a mixed message list', failure({ ...BODY, message: ['a', 1] })],
    ['a body without a status code', failure({ ...BODY, statusCode: '409' })],
    ['a body without an error name', failure({ ...BODY, error: 1 })],
  ])('returns null for %s', (_name, value) => {
    expect(apiError(value)).toBeNull();
  });
});

describe('hasApiMessage', () => {
  it('matches a single message and an item of a list', () => {
    expect(hasApiMessage(failure(BODY), TAG_ERROR_MESSAGE.LimitReached)).toBe(true);
    expect(
      hasApiMessage(
        failure({ ...BODY, message: ['x', TAG_ERROR_MESSAGE.LimitReached] }),
        TAG_ERROR_MESSAGE.LimitReached,
      ),
    ).toBe(true);
  });

  it('does not match another message or a failure without a body', () => {
    expect(hasApiMessage(failure(BODY), TAG_ERROR_MESSAGE.NameTaken)).toBe(false);
    expect(hasApiMessage(new Error('x'), TAG_ERROR_MESSAGE.NameTaken)).toBe(false);
  });
});
