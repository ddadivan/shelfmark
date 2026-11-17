import { ApiProperty } from '@nestjs/swagger';
import type { TidyCountResponse } from '@shelfmark/contracts';

export class TidyCountResponseDto implements TidyCountResponse {
  @ApiProperty({ description: 'Links in Unsorted with suggestions to review' }) total!: number;
}
