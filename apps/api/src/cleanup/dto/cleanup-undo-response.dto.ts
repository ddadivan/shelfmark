import { ApiProperty } from '@nestjs/swagger';
import type { CleanupUndoResponse } from '@shelfmark/contracts';

export class CleanupUndoResponseDto implements CleanupUndoResponse {
  @ApiProperty({ minimum: 0 }) restored!: number;
  @ApiProperty({ minimum: 0 }) unmerged!: number;
}
