import { ApiProperty } from '@nestjs/swagger';
import type { MeStatsWeek } from '@shelfmark/contracts';

export class MeStatsWeekDto implements MeStatsWeek {
  @ApiProperty({ format: 'date', example: '2026-11-09', description: 'Monday of the week, UTC' })
  weekStart!: string;

  @ApiProperty({ description: 'Live links created that week' })
  count!: number;
}
