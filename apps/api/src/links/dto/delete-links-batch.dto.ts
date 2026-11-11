import { ApiProperty } from '@nestjs/swagger';
import { LINK_LIMIT, type DeleteLinksBatchRequest } from '@shelfmark/contracts';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class DeleteLinksBatchDto implements DeleteLinksBatchRequest {
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
}
