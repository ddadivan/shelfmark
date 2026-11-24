import { ApiProperty } from '@nestjs/swagger';
import type { ReaderProgress } from '@shelfmark/contracts';

export class ReaderProgressDto implements ReaderProgress {
  @ApiProperty({ format: 'uuid' })
  linkId!: string;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.42 })
  fraction!: number;

  @ApiProperty({ minimum: 0, example: 4 })
  minutesLeft!: number;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
