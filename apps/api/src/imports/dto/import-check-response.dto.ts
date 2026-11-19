import { ApiProperty } from '@nestjs/swagger';
import type { ImportCheckResponse } from '@shelfmark/contracts';

export class ImportCheckResponseDto implements ImportCheckResponse {
  @ApiProperty({
    type: [Number],
    description: 'Indexes into urls that match one of your live links, ascending',
  })
  saved!: number[];

  @ApiProperty({
    description: 'How many more links fit your link limit (the demo limit in a demo sandbox)',
  })
  room!: number;
}
