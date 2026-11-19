import { ApiProperty } from '@nestjs/swagger';
import type { ListImportsResponse } from '@shelfmark/contracts';
import { ImportSummaryDto } from './import-summary.dto';

export class ListImportsResponseDto implements ListImportsResponse {
  @ApiProperty({ type: [ImportSummaryDto] }) items!: ImportSummaryDto[];
}
