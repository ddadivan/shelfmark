import { ApiProperty } from '@nestjs/swagger';
import type { UndoImportResponse } from '@shelfmark/contracts';

export class UndoImportResponseDto implements UndoImportResponse {
  @ApiProperty({ description: 'Links moved to Trash' }) links!: number;
  @ApiProperty({ description: 'Folders moved to Trash' }) folders!: number;
  @ApiProperty({ description: 'Tags deleted' }) tags!: number;
}
