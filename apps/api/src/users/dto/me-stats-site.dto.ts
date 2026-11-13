import { ApiProperty } from '@nestjs/swagger';
import type { MeStatsSite } from '@shelfmark/contracts';

export class MeStatsSiteDto implements MeStatsSite {
  @ApiProperty({ example: 'github.com', description: 'Lower-case host without www.' })
  host!: string;

  @ApiProperty({ description: 'Live links on this host' })
  count!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '/api/links/018f…/favicon?v=0123456789abcdef',
    description: 'Same-origin favicon path of the newest link on this host that has one',
  })
  faviconUrl!: string | null;
}
