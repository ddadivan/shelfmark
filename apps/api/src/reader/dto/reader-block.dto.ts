import { ApiProperty } from '@nestjs/swagger';
import {
  READER_BLOCK_KIND,
  type ReaderBlock,
  type ReaderBlockKind,
  type ReaderHeadingLevel,
} from '@shelfmark/contracts';
import { ReaderListItemDto } from './reader-list-item.dto';
import { ReaderSpanDto } from './reader-span.dto';

export class ReaderBlockDto implements ReaderBlock {
  @ApiProperty({ enum: Object.values(READER_BLOCK_KIND), example: READER_BLOCK_KIND.Paragraph })
  kind!: ReaderBlockKind;

  @ApiProperty({
    description: 'Plain text (never HTML) of the block; the caption of an image; empty for a list',
    example: 'Good bread…',
  })
  text!: string;

  @ApiProperty({
    type: [ReaderSpanDto],
    description: 'Inline spans of a heading, paragraph, quote or note',
  })
  spans!: ReaderSpanDto[];

  @ApiProperty({ type: [ReaderListItemDto], description: 'List items; empty for every other kind' })
  items!: ReaderListItemDto[];

  @ApiProperty({ description: 'A numbered list' })
  ordered!: boolean;

  @ApiProperty({ type: Number, nullable: true, enum: [2, 3, 4], description: 'Heading level' })
  level!: ReaderHeadingLevel | null;

  @ApiProperty({ type: String, nullable: true, description: 'Name of a note (Note, Warning)' })
  label!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Language of a code block' })
  language!: string | null;

  @ApiProperty({
    type: 'array',
    items: { type: 'array', items: { type: 'string' } },
    description: 'Table rows of cell text',
  })
  rows!: string[][];

  @ApiProperty({ description: 'The first table row is a header' })
  header!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Absolute http(s) source of an image. The web app does not load it (CSP img-src self); it shows a placeholder with a link to the original',
  })
  imageUrl!: string | null;

  @ApiProperty({ description: 'Alternative text of an image' })
  alt!: string;
}
