import { ApiProperty } from '@nestjs/swagger';
import type { MeaningSearchResponse } from '@shelfmark/contracts';
import { AiSearchStatusDto } from './ai-search-status.dto';
import { MeaningMatchDto } from './meaning-match.dto';

export class MeaningSearchResponseDto implements MeaningSearchResponse {
  @ApiProperty({ type: AiSearchStatusDto }) status!: AiSearchStatusDto;
  @ApiProperty({ type: [MeaningMatchDto], description: 'Empty unless status.state is ready' })
  items!: MeaningMatchDto[];
}
