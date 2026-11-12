import { HttpStatusCode } from '@angular/common/http';
import { LINK_ERROR_MESSAGE } from '@shelfmark/contracts';
import { apiError, hasApiMessage } from '../../../../core/api/api-error';

/** The translation key explaining why saving a link failed; a generic one for anything unknown. */
export function saveErrorKey(error: unknown): string {
  switch (apiError(error)?.statusCode) {
    case HttpStatusCode.Conflict:
      if (hasApiMessage(error, LINK_ERROR_MESSAGE.LimitReached)) {
        return 'links.add.saveFailedLimit';
      }
      return hasApiMessage(error, LINK_ERROR_MESSAGE.ChangedMeanwhile)
        ? 'links.add.saveFailedChanged'
        : 'links.add.saveFailed';
    case HttpStatusCode.TooManyRequests:
      return 'links.add.saveFailedRateLimit';
    case HttpStatusCode.BadRequest:
      return 'links.add.saveFailedInvalid';
    default:
      return 'links.add.saveFailed';
  }
}
