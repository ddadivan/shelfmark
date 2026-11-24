import { ApiProperty } from '@nestjs/swagger';
import type { ReaderArticleResponse } from '@shelfmark/contracts';
import { ReaderArticleDto } from './reader-article.dto';

export class ReaderArticleResponseDto implements ReaderArticleResponse {
  @ApiProperty({
    type: ReaderArticleDto,
    nullable: true,
    description: 'null when the page has no article text, could not be read or previews are off',
  })
  article!: ReaderArticleDto | null;
}
