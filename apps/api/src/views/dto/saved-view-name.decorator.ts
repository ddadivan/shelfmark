import { SAVED_VIEW_LIMIT } from '@shelfmark/contracts';
import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';

/** A view name: trimmed, 1 to `SAVED_VIEW_LIMIT.NameMax` characters, no control characters. */
export const SavedViewName = (): PropertyDecorator =>
  applyDecorators(
    TrimString(),
    IsString(),
    NoControlChars(),
    MinLength(1),
    MaxLength(SAVED_VIEW_LIMIT.NameMax),
  );
