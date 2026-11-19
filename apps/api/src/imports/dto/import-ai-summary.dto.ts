import { ApiProperty } from '@nestjs/swagger';
import { IMPORT_AI_STATE, type ImportAiState, type ImportAiSummary } from '@shelfmark/contracts';

export class ImportAiSummaryDto implements ImportAiSummary {
  @ApiProperty({ enum: Object.values(IMPORT_AI_STATE) }) state!: ImportAiState;
  @ApiProperty({ description: 'Links the pass covers' }) total!: number;
  @ApiProperty({ description: 'Links with a result (or failed) so far' }) done!: number;
  @ApiProperty({ description: 'Links of the import that have an AI summary' }) summaries!: number;
  @ApiProperty({ description: 'Links of the import with open suggestions' }) suggestions!: number;
}
