import { BadRequestException } from '@nestjs/common';
import { normalizeTagName, TAG_ERROR_MESSAGE, TAG_LIMIT } from '@shelfmark/contracts';

/** Rejects an over-long tag name (400) before any page is fetched or transaction opened. */
export function assertTagNamesFit(names: readonly string[] | undefined): void {
  if (names?.some((name) => normalizeTagName(name).length > TAG_LIMIT.NameMax)) {
    throw new BadRequestException(TAG_ERROR_MESSAGE.NameTooLong);
  }
}
