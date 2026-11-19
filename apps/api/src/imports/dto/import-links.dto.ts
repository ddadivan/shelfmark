import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_LIMIT, type ImportLinksRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ImportLinkItemDto } from './import-link-item.dto';

export class ImportLinksDto implements ImportLinksRequest {
  @ApiProperty({ type: [ImportLinkItemDto], minItems: 1, maxItems: LINK_LIMIT.BatchMax })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LINK_LIMIT.BatchMax)
  @ValidateNested({ each: true })
  @Type(() => ImportLinkItemDto)
  items!: ImportLinkItemDto[];

  @ApiPropertyOptional({
    default: true,
    description: 'false keeps a URL repeated within the batch',
  })
  @IsOptional()
  @IsBoolean()
  skipRepeats?: boolean;
}
