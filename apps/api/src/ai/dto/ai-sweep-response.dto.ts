import { ApiProperty } from '@nestjs/swagger';
import type { AiSweepResponse } from '../models/ai-sweep-response.interface';

export class AiSweepResponseDto implements AiSweepResponse {
  @ApiProperty({ minimum: 0, example: 2 }) failed!: number;
  @ApiProperty({ minimum: 0, example: 5 }) deletedDrafts!: number;
  @ApiProperty({ minimum: 0, example: 3 }) users!: number;
}
