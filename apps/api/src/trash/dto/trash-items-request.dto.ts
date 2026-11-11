import { ApiProperty } from '@nestjs/swagger';
import { TRASH_LIMIT, type TrashItemsRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { TrashItemRefDto } from './trash-item-ref.dto';

export class TrashItemsRequestDto implements TrashItemsRequest {
  @ApiProperty({ type: [TrashItemRefDto], minItems: 1, maxItems: TRASH_LIMIT.BatchMax })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TRASH_LIMIT.BatchMax)
  @ValidateNested({ each: true })
  @Type(() => TrashItemRefDto)
  items!: TrashItemRefDto[];
}
