import { ApiProperty } from '@nestjs/swagger';
import { READER_LIMIT, type ReaderProgressRequest } from '@shelfmark/contracts';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class ReaderProgressRequestDto implements ReaderProgressRequest {
  @ApiProperty({
    minimum: 0,
    maximum: 1,
    example: 0.42,
    description: 'Share read (scroll position)',
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1)
  fraction!: number;

  @ApiProperty({ minimum: 0, maximum: READER_LIMIT.MinutesLeftMax, example: 4 })
  @IsInt()
  @Min(0)
  @Max(READER_LIMIT.MinutesLeftMax)
  minutesLeft!: number;
}
