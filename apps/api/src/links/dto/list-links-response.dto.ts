import { ApiProperty } from '@nestjs/swagger';
import type { ListLinksResponse } from '@shelfmark/contracts';
import { LinkResponseDto } from './link-response.dto';

export class ListLinksResponseDto implements ListLinksResponse {
  @ApiProperty({ type: [LinkResponseDto] }) items!: LinkResponseDto[];
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Opaque cursor for the next page; null on the last page',
  })
  nextCursor!: string | null;
}
