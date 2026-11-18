import { ApiProperty } from '@nestjs/swagger';
import type { RelatedLinksResponse } from '@shelfmark/contracts';
import { AiSearchStatusDto } from './ai-search-status.dto';
import { MeaningMatchDto } from './meaning-match.dto';

export class RelatedLinksResponseDto implements RelatedLinksResponse {
  @ApiProperty({ type: AiSearchStatusDto }) status!: AiSearchStatusDto;
  @ApiProperty({
    type: [MeaningMatchDto],
    description: 'Empty while search by meaning is off or the link has no vector yet',
  })
  items!: MeaningMatchDto[];
}
