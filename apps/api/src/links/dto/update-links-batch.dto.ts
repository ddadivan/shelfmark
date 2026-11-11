import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_LIMIT, TAG_LIMIT, type UpdateLinksBatchRequest } from '@shelfmark/contracts';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';

/** Raw names may carry spaces that normalisation turns into hyphens; the exact limit is checked after it. */
const RAW_TAG_MAX = 4 * TAG_LIMIT.NameMax;

const present = (_object: unknown, value: unknown): boolean => value !== undefined;

export class UpdateLinksBatchDto implements UpdateLinksBatchRequest {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: LINK_LIMIT.BatchMax,
    uniqueItems: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LINK_LIMIT.BatchMax)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids!: string[];

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'Move to this live folder of yours; null moves to Unsorted',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: LINK_LIMIT.TagsMax })
  @ValidateIf(present)
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.TagsMax)
  @IsString({ each: true })
  @NoControlChars(true, { each: true })
  @MaxLength(RAW_TAG_MAX, { each: true })
  addTags?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: LINK_LIMIT.TagsMax })
  @ValidateIf(present)
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.TagsMax)
  @IsString({ each: true })
  @NoControlChars(true, { each: true })
  @MaxLength(RAW_TAG_MAX, { each: true })
  removeTags?: string[];

  @ApiPropertyOptional()
  @ValidateIf(present)
  @IsBoolean()
  isFavorite?: boolean;
}
