import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_LIMIT, TAG_LIMIT, type CreateLinksBatchRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { CreateLinksBatchItemDto } from './create-links-batch-item.dto';

/** Upper bound for one raw tag name; the service normalizes it and enforces `TAG_LIMIT.NameMax`. */
const RAW_TAG_MAX = 4 * TAG_LIMIT.NameMax;

export class CreateLinksBatchDto implements CreateLinksBatchRequest {
  @ApiProperty({
    type: [CreateLinksBatchItemDto],
    minItems: 1,
    maxItems: LINK_LIMIT.BatchMax,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LINK_LIMIT.BatchMax)
  @ValidateNested({ each: true })
  @Type(() => CreateLinksBatchItemDto)
  items!: CreateLinksBatchItemDto[];

  @ApiPropertyOptional({ format: 'uuid', description: 'One of your folders, for every link' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: LINK_LIMIT.TagsMax,
    description: 'Tag names for every link; missing tags are created',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(LINK_LIMIT.TagsMax)
  @IsString({ each: true })
  @NoControlChars(true, { each: true })
  @MaxLength(RAW_TAG_MAX, { each: true })
  tags?: string[];
}
