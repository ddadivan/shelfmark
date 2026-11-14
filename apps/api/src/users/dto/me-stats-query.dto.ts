import { ApiPropertyOptional } from '@nestjs/swagger';
import { ME_STATS_FIRST_DAY, type MeStatsQuery } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MeStatsQueryDto implements MeStatsQuery {
  @ApiPropertyOptional({
    minimum: ME_STATS_FIRST_DAY.Min,
    maximum: ME_STATS_FIRST_DAY.Max,
    default: ME_STATS_FIRST_DAY.Default,
    description: 'ISO weekday the weeks of weeklyLinks start on: 1 Monday … 7 Sunday',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ME_STATS_FIRST_DAY.Min)
  @Max(ME_STATS_FIRST_DAY.Max)
  firstDay?: number;
}
