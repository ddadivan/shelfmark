import { ApiProperty } from '@nestjs/swagger';
import { PIN_LIMIT, type ReorderPinsRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { PinRefDto } from './pin-ref.dto';

export class ReorderPinsDto implements ReorderPinsRequest {
  @ApiProperty({ type: [PinRefDto], maxItems: PIN_LIMIT.Max })
  @IsArray()
  @ArrayMaxSize(PIN_LIMIT.Max)
  @ValidateNested({ each: true })
  @Type(() => PinRefDto)
  items!: PinRefDto[];
}
