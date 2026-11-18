import { ApiProperty } from '@nestjs/swagger';
import type { CleanupApplyResponse } from '@shelfmark/contracts';
import { CleanupUndoDto } from './cleanup-undo.dto';

export class CleanupApplyResponseDto implements CleanupApplyResponse {
  @ApiProperty({ minimum: 0 }) trashed!: number;
  @ApiProperty({ minimum: 0 }) merged!: number;
  @ApiProperty({ minimum: 0 }) skipped!: number;
  @ApiProperty({ type: CleanupUndoDto, description: 'Send back unchanged to the Undo route' })
  undo!: CleanupUndoDto;
}
