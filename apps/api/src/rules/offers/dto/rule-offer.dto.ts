import { ApiProperty } from '@nestjs/swagger';
import type { RuleOffer } from '@shelfmark/contracts';

export class RuleOfferDto implements RuleOffer {
  @ApiProperty({ example: 'youtube.com', description: 'The site, as a rule stores it' })
  domain!: string;
  @ApiProperty({ format: 'uuid', description: 'One of your live folders' }) folderId!: string;
  @ApiProperty({ description: 'How many of your newest links of the site are in the folder' })
  count!: number;
}
