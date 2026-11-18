import { ApiProperty } from '@nestjs/swagger';
import type { CleanupSummary } from '@shelfmark/contracts';

export class CleanupSummaryDto implements CleanupSummary {
  @ApiProperty() show!: boolean;
  @ApiProperty({ minimum: 0 }) duplicates!: number;
  @ApiProperty({ minimum: 0 }) similarTags!: number;
}
