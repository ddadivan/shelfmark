import { HttpStatusCode } from '@angular/common/http';
import { linkLimitFit } from '@shelfmark/contracts';
import { apiError } from '../../../core/api/api-error';
import { pluralKey } from '../../../core/i18n/plural-key';
import { saveErrorKey } from '../add-link/save-error-key';
import type { BatchSaveError } from './models/batch-save-error.interface';

/**
 * Why saving the paste-many list failed, as a translation key and its parameters. A 409 for the
 * link limit names how many links still fit ("Only 12 more links fit"); everything else reads
 * like a failed single save.
 */
export function batchSaveError(error: unknown): BatchSaveError {
  const body = apiError(error);
  const fit = body?.statusCode === HttpStatusCode.Conflict ? linkLimitFit(body.message) : null;
  if (fit !== null) {
    return fit > 0
      ? { key: pluralKey('links.many.saveFailedFit', fit), fit }
      : { key: 'links.add.saveFailedLimit', fit: null };
  }
  return { key: saveErrorKey(error), fit: null };
}
