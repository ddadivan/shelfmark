import { ApiProperty } from '@nestjs/swagger';
import type { OpenLinkResponse } from '@shelfmark/contracts';
import { LinkResponseDto } from './link-response.dto';

export class OpenLinkResponseDto extends LinkResponseDto implements OpenLinkResponse {
  @ApiProperty({
    example: true,
    description: 'False while the history is paused: the open was not recorded',
  })
  recorded!: boolean;
}
