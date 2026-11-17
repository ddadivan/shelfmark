import { ApiProperty } from '@nestjs/swagger';
import type { AiUsage } from '@shelfmark/contracts';

export class AiUsageDto implements AiUsage {
  @ApiProperty({ description: 'Links processed this UTC month' }) linksUsed!: number;
  @ApiProperty() linksLimit!: number;
  @ApiProperty({ format: 'date', example: '2026-12-01' }) resetsOn!: string;
  @ApiProperty() backfillUsed!: number;
  @ApiProperty({ description: '0 = backfill not available' }) backfillLimit!: number;
}
