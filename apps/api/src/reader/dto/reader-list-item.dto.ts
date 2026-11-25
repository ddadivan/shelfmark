import { ApiProperty } from '@nestjs/swagger';
import type { ReaderListItem } from '@shelfmark/contracts';
import { ReaderSpanDto } from './reader-span.dto';

export class ReaderListItemDto implements ReaderListItem {
  @ApiProperty({ type: [ReaderSpanDto] })
  spans!: ReaderSpanDto[];

  @ApiProperty({
    type: () => [ReaderListItemDto],
    description: 'Items of a list nested in this one',
  })
  items!: ReaderListItemDto[];
}
