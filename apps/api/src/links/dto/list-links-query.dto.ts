import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  LINK_LIMIT,
  LINK_SORT_FIELD,
  PAGE_LIMIT,
  SORT_ORDER,
  TAG_LIMIT,
  type LinkSortField,
  type ListLinksQuery,
  type SortOrder,
} from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TrimString } from '../../folders/dto/trim-string.decorator';
import { NormalizeTagFilter } from './normalize-tag-filter.decorator';
import { QueryBoolean } from './query-boolean.decorator';

export class ListLinksQueryDto implements ListLinksQuery {
  @ApiPropertyOptional({ format: 'uuid', description: 'Direct children of this folder' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Only links without a folder; not with folderId' })
  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  unsorted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  favorite?: boolean;

  @ApiPropertyOptional({
    type: [String],
    maxItems: LINK_LIMIT.TagFilterMax,
    description: 'Repeat the parameter for several tags; a link must have all of them',
  })
  @IsOptional()
  @NormalizeTagFilter()
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.TagFilterMax)
  @IsString({ each: true })
  @MaxLength(TAG_LIMIT.NameMax, { each: true })
  tag?: string[];

  @ApiPropertyOptional({
    maxLength: LINK_LIMIT.QueryMax,
    description: `Words (at most ${LINK_LIMIT.QueryTermsMax} are used) matched against title, note and URL`,
  })
  @IsOptional()
  @TrimString()
  @IsString()
  @MaxLength(LINK_LIMIT.QueryMax)
  q?: string;

  @ApiPropertyOptional({ enum: Object.values(LINK_SORT_FIELD), default: LINK_SORT_FIELD.CreatedAt })
  @IsOptional()
  @IsIn(Object.values(LINK_SORT_FIELD))
  sort?: LinkSortField;

  @ApiPropertyOptional({ enum: Object.values(SORT_ORDER), default: SORT_ORDER.Desc })
  @IsOptional()
  @IsIn(Object.values(SORT_ORDER))
  order?: SortOrder;

  @ApiPropertyOptional({ maxLength: PAGE_LIMIT.CursorMax })
  @IsOptional()
  @IsString()
  @MaxLength(PAGE_LIMIT.CursorMax)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: PAGE_LIMIT.Max, default: PAGE_LIMIT.Default })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_LIMIT.Max)
  limit?: number;
}
