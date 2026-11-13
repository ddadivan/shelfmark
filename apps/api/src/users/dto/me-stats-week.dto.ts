import { ApiProperty } from '@nestjs/swagger';
import type { MeStatsWeek } from '@shelfmark/contracts';

export class MeStatsWeekDto implements MeStatsWeek {
  @ApiProperty({
    format: 'date',
    example: '2026-11-09',
    description: 'First day of the week (firstDay, Monday by default), UTC',
  })
  weekStart!: string;

  @ApiProperty({ description: 'Live links created that week' })
  count!: number;
}
