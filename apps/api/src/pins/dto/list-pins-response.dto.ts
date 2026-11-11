import { ApiProperty } from '@nestjs/swagger';
import type { ListPinsResponse } from '@shelfmark/contracts';
import { PinResponseDto } from './pin-response.dto';

export class ListPinsResponseDto implements ListPinsResponse {
  @ApiProperty({ type: [PinResponseDto] }) items!: PinResponseDto[];
}
