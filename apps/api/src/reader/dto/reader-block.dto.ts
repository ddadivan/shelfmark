import { ApiProperty } from '@nestjs/swagger';
import { READER_BLOCK_KIND, type ReaderBlock, type ReaderBlockKind } from '@shelfmark/contracts';

export class ReaderBlockDto implements ReaderBlock {
  @ApiProperty({ enum: Object.values(READER_BLOCK_KIND), example: READER_BLOCK_KIND.Paragraph })
  kind!: ReaderBlockKind;

  @ApiProperty({ description: 'Plain text (never HTML); empty for a list', example: 'Good bread…' })
  text!: string;

  @ApiProperty({ type: [String], description: 'List items; empty for every other kind' })
  items!: string[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Always null: no remote image URL is sent (the link keeps its own captured image)',
  })
  imageUrl!: string | null;
}
