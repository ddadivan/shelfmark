import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  SAVED_VIEW_ICON,
  SAVED_VIEW_LIMIT,
  type SavedViewIcon,
  type UpdateSavedViewRequest,
} from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsIn, IsObject, ValidateIf, ValidateNested } from 'class-validator';
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

  /** `null` clears the glyph; absent keeps it. */
  @ApiPropertyOptional({ enum: Object.values(SAVED_VIEW_ICON), nullable: true })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined && value !== null)
  @IsIn(Object.values(SAVED_VIEW_ICON))
  icon?: SavedViewIcon | null;
}
