import { ApiProperty } from '@nestjs/swagger';
import type { UpdateLinksBatchResponse } from '@shelfmark/contracts';
import { LinkResponseDto } from './link-response.dto';

export class UpdateLinksBatchResponseDto implements UpdateLinksBatchResponse {
  @ApiProperty({ description: "How many of the user's live links were changed" }) updated!: number;
  @ApiProperty({ type: [LinkResponseDto], description: 'The changed links, in request order' })
  links!: LinkResponseDto[];
}
