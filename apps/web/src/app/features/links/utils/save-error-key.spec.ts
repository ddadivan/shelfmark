import { HttpErrorResponse } from '@angular/common/http';
import { LINK_ERROR_MESSAGE } from '@shelfmark/contracts';
import { saveErrorKey } from './save-error-key';

function failure(statusCode: number, message: string | string[]): HttpErrorResponse {
  return new HttpErrorResponse({
    status: statusCode,
    error: { statusCode, error: 'Error', message, requestId: 'r1' },
  });
}

describe('saveErrorKey', () => {
  it.each([
    [failure(409, LINK_ERROR_MESSAGE.LimitReached), 'links.add.saveFailedLimit'],
    [failure(409, LINK_ERROR_MESSAGE.ChangedMeanwhile), 'links.add.saveFailedChanged'],
    [failure(409, 'something else'), 'links.add.saveFailed'],
    [failure(429, 'Too Many Requests'), 'links.add.saveFailedRateLimit'],
    [failure(400, ['url must be a URL']), 'links.add.saveFailedInvalid'],
    [failure(500, 'boom'), 'links.add.saveFailed'],
    [new HttpErrorResponse({ status: 0 }), 'links.add.saveFailed'],
    [new Error('x'), 'links.add.saveFailed'],
  ])('maps %#', (error, key) => {
    expect(saveErrorKey(error)).toBe(key);
  });
});
