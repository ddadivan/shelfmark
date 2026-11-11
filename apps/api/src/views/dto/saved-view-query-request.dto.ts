import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LINK_KIND,
  LINK_LIMIT,
  LINK_SORT_FIELD,
  SAVED_VIEW_LIMIT,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  TAG_LIMIT,
  type LinkKind,
  type LinkSortField,
  type SavedViewQueryRequest,
  type SavedViewScope,
  type SortOrder,
} from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { NormalizeTagList } from './normalize-tag-list.decorator';

/** `null` means "none" for these fields: only a real value is validated. */
const hasValue = (_object: unknown, value: unknown): boolean =>
  value !== undefined && value !== null;

/** The strict filter of a view; unknown fields are a 400 (global `forbidNonWhitelisted`). */
export class SavedViewQueryRequestDto implements SavedViewQueryRequest {
  @ApiProperty({ enum: Object.values(SAVED_VIEW_SCOPE) })
  @IsIn(Object.values(SAVED_VIEW_SCOPE))
  scope!: SavedViewScope;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @ValidateIf(hasValue)
  @IsUUID()
  folderId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: SAVED_VIEW_LIMIT.TagsMax })
  @IsOptional()
  @NormalizeTagList()
  @IsArray()
  @ArrayMaxSize(SAVED_VIEW_LIMIT.TagsMax)
  @IsString({ each: true })
  @NoControlChars(false, { each: true })
  @MaxLength(TAG_LIMIT.NameMax, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: Object.values(LINK_KIND), nullable: true })
  @ValidateIf(hasValue)
  @IsIn(Object.values(LINK_KIND))
  kind?: LinkKind | null;

  @ApiPropertyOptional({ enum: Object.values(LINK_SORT_FIELD) })
  @IsOptional()
  @IsIn(Object.values(LINK_SORT_FIELD))
  sort?: LinkSortField;

  @ApiPropertyOptional({ enum: Object.values(SORT_ORDER) })
  @IsOptional()
  @IsIn(Object.values(SORT_ORDER))
  order?: SortOrder;

  @ApiPropertyOptional({ maxLength: LINK_LIMIT.QueryMax })
  @IsOptional()
  @TrimString()
  @IsString()
  @NoControlChars()
  @MaxLength(LINK_LIMIT.QueryMax)
  q?: string;
}
