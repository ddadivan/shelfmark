import { ApiProperty } from '@nestjs/swagger';
import type { ReaderProgressResponse } from '@shelfmark/contracts';
import { ReaderProgressDto } from './reader-progress.dto';

export class ReaderProgressResponseDto implements ReaderProgressResponse {
  @ApiProperty({
    type: ReaderProgressDto,
    nullable: true,
    description: 'null when nothing is stored',
  })
  progress!: ReaderProgressDto | null;
}
