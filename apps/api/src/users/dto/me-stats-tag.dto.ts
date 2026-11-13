import { ApiProperty } from '@nestjs/swagger';
import type { MeStatsTag } from '@shelfmark/contracts';

export class MeStatsTagDto implements MeStatsTag {
  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'Live links with this tag' })
  count!: number;
}
