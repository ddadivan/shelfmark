import { ApiProperty } from '@nestjs/swagger';
import type { ReaderArticle } from '@shelfmark/contracts';
import { ReaderBlockDto } from './reader-block.dto';

export class ReaderArticleDto implements ReaderArticle {
  @ApiProperty({ example: 'Slow bread at home' })
  title!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Mara Lindqvist' })
  author!: string | null;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  publishedAt!: string | null;

  @ApiProperty({ minimum: 1, example: 6, description: 'Estimated reading time in minutes' })
  minutes!: number;

  @ApiProperty({ type: [ReaderBlockDto] })
  blocks!: ReaderBlockDto[];
}
