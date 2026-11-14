import { ApiProperty } from '@nestjs/swagger';
import { ME_STATS_LIMIT, type MeStatsResponse } from '@shelfmark/contracts';
import { ConnectedAccountDto } from './connected-account.dto';
import { MeStatsSiteDto } from './me-stats-site.dto';
import { MeStatsTagDto } from './me-stats-tag.dto';
import { MeStatsWeekDto } from './me-stats-week.dto';

export class MeStatsResponseDto implements MeStatsResponse {
  @ApiProperty({ description: 'Live links (Trash left out)' })
  linkCount!: number;

  @ApiProperty({ description: 'Live folders (Trash left out)' })
  folderCount!: number;

  @ApiProperty()
  tagCount!: number;

  @ApiProperty({ type: [MeStatsSiteDto], maxItems: ME_STATS_LIMIT.TopSites })
  topSites!: MeStatsSiteDto[];

  @ApiProperty({ type: [MeStatsTagDto], maxItems: ME_STATS_LIMIT.TopTags })
  topTags!: MeStatsTagDto[];

  @ApiProperty({
    type: [MeStatsWeekDto],
    minItems: ME_STATS_LIMIT.Weeks,
    maxItems: ME_STATS_LIMIT.Weeks,
    description: 'Oldest first, the current week last',
  })
  weeklyLinks!: MeStatsWeekDto[];

  @ApiProperty({ format: 'date-time' })
  memberSince!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  oldestLinkAt!: string | null;

  @ApiProperty({ type: [ConnectedAccountDto] })
  connectedAccounts!: ConnectedAccountDto[];
}
