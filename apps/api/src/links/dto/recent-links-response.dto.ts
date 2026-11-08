import { ApiProperty } from '@nestjs/swagger';
import type { RecentLinksResponse } from '@shelfmark/contracts';
import { LinkResponseDto } from './link-response.dto';

export class RecentLinksResponseDto implements RecentLinksResponse {
  @ApiProperty({ type: [LinkResponseDto] }) items!: LinkResponseDto[];
}
