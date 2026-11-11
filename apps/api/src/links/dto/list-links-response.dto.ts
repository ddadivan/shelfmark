import { ApiProperty } from '@nestjs/swagger';
import type { ListLinksResponse } from '@shelfmark/contracts';
import { LinkResponseDto } from './link-response.dto';

export class ListLinksResponseDto implements ListLinksResponse {
  @ApiProperty({ type: [LinkResponseDto] }) items!: LinkResponseDto[];
  @ApiProperty({
    type: [LinkResponseDto],
    description:
      'Links pinned to the top of the requested folder (first page of a folder list only), in pin order; not repeated in items',
  })
  pinned!: LinkResponseDto[];
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Opaque cursor for the next page; null on the last page',
  })
  nextCursor!: string | null;
}
