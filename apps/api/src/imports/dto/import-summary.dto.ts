import { ApiProperty } from '@nestjs/swagger';
import { ImportAiSummaryDto } from './import-ai-summary.dto';
import { IMPORT_SOURCE, type ImportSource, type ImportSummary } from '@shelfmark/contracts';

export class ImportSummaryDto implements ImportSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: Object.values(IMPORT_SOURCE) }) source!: ImportSource;
  @ApiProperty() fileName!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) finishedAt!: string | null;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'The target folder while it is live, else null',
  })
  targetFolderId!: string | null;
  @ApiProperty() linksCreated!: number;
  @ApiProperty() foldersCreated!: number;
  @ApiProperty() skipped!: number;
  @ApiProperty() failed!: number;
  @ApiProperty({
    type: ImportAiSummaryDto,
    nullable: true,
    description: 'The AI pass, when the import asked for one; else null',
  })
  ai!: ImportAiSummaryDto | null;
}
