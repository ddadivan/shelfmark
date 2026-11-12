import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  SAVED_VIEW_LIMIT,
  SAVED_VIEW_SCOPE,
  TAG_LIMIT,
  type ListSavedViewsQuery,
  type SavedViewScope,
} from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { NormalizeTagFilter } from '../../links/dto/normalize-tag-filter.decorator';

/** `GET /api/views` query: the feed the counts are narrowed to; every field is optional and strict. */
export class ListSavedViewsQueryDto implements ListSavedViewsQuery {
  @ApiPropertyOptional({ enum: Object.values(SAVED_VIEW_SCOPE) })
  @IsOptional()
  @IsIn(Object.values(SAVED_VIEW_SCOPE))
  scope?: SavedViewScope;

  @ApiPropertyOptional({ format: 'uuid', description: 'With `scope=folder`' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: SAVED_VIEW_LIMIT.TagsMax,
    description: 'Repeat the parameter for several tags; a link must have all of them',
  })
  @IsOptional()
  @NormalizeTagFilter()
  @IsArray()
  @ArrayMaxSize(SAVED_VIEW_LIMIT.TagsMax)
  @IsString({ each: true })
  @NoControlChars(false, { each: true })
  @MaxLength(TAG_LIMIT.NameMax, { each: true })
  tag?: string[];
}
