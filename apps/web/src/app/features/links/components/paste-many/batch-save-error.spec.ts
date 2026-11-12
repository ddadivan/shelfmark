import { HttpErrorResponse } from '@angular/common/http';
import { LINK_ERROR_MESSAGE, linkLimitMessage } from '@shelfmark/contracts';
import { batchSaveError } from './batch-save-error';

function apiFailure(statusCode: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: statusCode,
    error: { statusCode, error: 'Error', message, requestId: 'req-1' },
  });
}

describe('batchSaveError', () => {
  it('names how many links still fit when the batch is over the limit', () => {
    expect(batchSaveError(apiFailure(409, linkLimitMessage(12)))).toEqual({
      key: 'links.many.saveFailedFit.other',
      fit: 12,
    });
    expect(batchSaveError(apiFailure(409, linkLimitMessage(1)))).toEqual({
      key: 'links.many.saveFailedFit.one',
      fit: 1,
    });
  });

  it('says the limit is reached when no link fits any more', () => {
    expect(batchSaveError(apiFailure(409, linkLimitMessage(0)))).toEqual({
      key: 'links.add.saveFailedLimit',
      fit: null,
    });
    expect(batchSaveError(apiFailure(409, LINK_ERROR_MESSAGE.LimitReached))).toEqual({
      key: 'links.add.saveFailedLimit',
      fit: null,
    });
  });

  it('reads other failures like a single save', () => {
    expect(batchSaveError(apiFailure(409, LINK_ERROR_MESSAGE.ChangedMeanwhile)).key).toBe(
      'links.add.saveFailedChanged',
    );
    expect(batchSaveError(apiFailure(429, 'Too Many Requests')).key).toBe(
      'links.add.saveFailedRateLimit',
    );
    expect(batchSaveError(new Error('offline')).key).toBe('links.add.saveFailed');
  });
});
