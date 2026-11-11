import { ApiProperty } from '@nestjs/swagger';
import type { TrashCleanupResponse } from '../models/trash-cleanup-response.interface';

export class TrashCleanupResponseDto implements TrashCleanupResponse {
  @ApiProperty({ minimum: 0, example: 12 })
  deleted!: number;

  @ApiProperty({ example: false })
  hasMore!: boolean;
}
