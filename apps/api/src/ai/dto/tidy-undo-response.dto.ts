import { ApiProperty } from '@nestjs/swagger';
import type { TidyUndoResponse } from '@shelfmark/contracts';
import { LinkResponseDto } from '../../links/dto/link-response.dto';

export class TidyUndoResponseDto implements TidyUndoResponse {
  @ApiProperty({ type: [LinkResponseDto], description: 'The links of the run as they are now' })
  links!: LinkResponseDto[];
}
