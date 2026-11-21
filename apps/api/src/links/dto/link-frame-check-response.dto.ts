import { ApiProperty } from '@nestjs/swagger';
import { LINK_FRAMING, type LinkFrameCheckResponse, type LinkFraming } from '@shelfmark/contracts';

export class LinkFrameCheckResponseDto implements LinkFrameCheckResponse {
  @ApiProperty({ format: 'uuid' })
  linkId!: string;

  @ApiProperty({ example: 'example.com', description: 'The host of the link, the cache key' })
  host!: string;

  @ApiProperty({ enum: Object.values(LINK_FRAMING), example: LINK_FRAMING.Allowed })
  framing!: LinkFraming;

  @ApiProperty({ format: 'date-time', description: 'When the host was last checked' })
  checkedAt!: string;

  @ApiProperty({
    example: false,
    description: 'True when a blocked host was appended to previewNewTabHosts by this call',
  })
  addedToNewTabHosts!: boolean;
}
