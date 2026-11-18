import { ApiProperty } from '@nestjs/swagger';
import type { CleanupUndoRequest } from '@shelfmark/contracts';
import { IsUUID } from 'class-validator';

export class CleanupUndoDto implements CleanupUndoRequest {
  @ApiProperty({ format: 'uuid', description: 'The run id of the apply answer' })
  @IsUUID()
  runId!: string;
}
