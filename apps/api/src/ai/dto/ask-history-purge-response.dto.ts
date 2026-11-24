import { ApiProperty } from '@nestjs/swagger';
import type { AskHistoryPurgeResponse } from '../models/ask-history-purge-response.interface';

export class AskHistoryPurgeResponseDto implements AskHistoryPurgeResponse {
  @ApiProperty({ minimum: 0, example: 3 }) deleted!: number;
  @ApiProperty({ example: false }) hasMore!: boolean;
}
