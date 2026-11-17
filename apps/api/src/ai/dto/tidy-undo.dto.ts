import { ApiProperty } from '@nestjs/swagger';
import { TIDY_LIMIT, type TidyUndoRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, ValidateNested } from 'class-validator';
import { TidyUndoItemDto } from './tidy-undo-item.dto';

export class TidyUndoDto implements TidyUndoRequest {
  @ApiProperty({ type: [TidyUndoItemDto], minItems: 1, maxItems: TIDY_LIMIT.PageMax })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TIDY_LIMIT.PageMax)
  @ArrayUnique((item: TidyUndoItemDto) => item.linkId)
  @ValidateNested({ each: true })
  @Type(() => TidyUndoItemDto)
  items!: TidyUndoItemDto[];
}
