import { ApiPropertyOptional } from '@nestjs/swagger';
import { SAVED_VIEW_LIMIT, type UpdateSavedViewRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsObject, ValidateIf, ValidateNested } from 'class-validator';
import { SavedViewName } from './saved-view-name.decorator';
import { SavedViewQueryRequestDto } from './saved-view-query-request.dto';

/** `null` is not a value for these fields: only `undefined` (absent) skips validation. */
const present = (_object: unknown, value: unknown): boolean => value !== undefined;

export class UpdateSavedViewDto implements UpdateSavedViewRequest {
  @ApiPropertyOptional({ minLength: 1, maxLength: SAVED_VIEW_LIMIT.NameMax })
  @ValidateIf(present)
  @SavedViewName()
  name?: string;

  @ApiPropertyOptional({ type: SavedViewQueryRequestDto })
  @ValidateIf(present)
  @IsObject()
  @ValidateNested()
  @Type(() => SavedViewQueryRequestDto)
  query?: SavedViewQueryRequestDto;
}
