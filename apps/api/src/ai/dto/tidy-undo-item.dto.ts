import { ApiProperty } from '@nestjs/swagger';
import { LINK_LIMIT, TAG_LIMIT, TIDY_LIMIT, type TidyUndoItem } from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';

export class TidyUndoItemDto implements TidyUndoItem {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  linkId!: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'The folder the run set',
  })
  @ValidateIf((_, value: unknown) => value !== null)
  @IsUUID()
  folderId!: string | null;

  @ApiProperty({
    type: [String],
    maxItems: LINK_LIMIT.TagsMax,
    description: 'Tag names the run added',
  })
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.TagsMax)
  @IsString({ each: true })
  @NoControlChars(true, { each: true })
  @MaxLength(TAG_LIMIT.NameMax, { each: true })
  tags!: string[];

  @ApiProperty({
    type: [String],
    format: 'uuid',
    maxItems: TIDY_LIMIT.SuggestionIdsPerLinkMax,
    uniqueItems: true,
  })
  @IsArray()
  @ArrayMaxSize(TIDY_LIMIT.SuggestionIdsPerLinkMax)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  suggestionIds!: string[];
}
