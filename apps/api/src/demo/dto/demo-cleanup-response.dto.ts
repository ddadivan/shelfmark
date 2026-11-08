import { ApiProperty } from '@nestjs/swagger';
import type { DemoCleanupResponse } from '../models/demo-cleanup-response.interface';

export class DemoCleanupResponseDto implements DemoCleanupResponse {
  @ApiProperty({ minimum: 0, example: 12 })
  deleted!: number;

  @ApiProperty({ example: false })
  hasMore!: boolean;
}
