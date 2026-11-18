import { ApiProperty } from '@nestjs/swagger';
import { TIDY_LIMIT, type TidyApplyRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, ValidateNested } from 'class-validator';
import { TidyApplyItemDto } from './tidy-apply-item.dto';

export class TidyApplyDto implements TidyApplyRequest {
  @ApiProperty({ type: [TidyApplyItemDto], minItems: 1, maxItems: TIDY_LIMIT.PageMax })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TIDY_LIMIT.PageMax)
  @ArrayUnique((item: TidyApplyItemDto) => item.linkId)
  @ValidateNested({ each: true })
  @Type(() => TidyApplyItemDto)
  items!: TidyApplyItemDto[];
}
