import { ApiProperty } from '@nestjs/swagger';
import { AI_SEARCH_LIMIT, type MeaningMatch } from '@shelfmark/contracts';
import { LinkResponseDto } from '../../links/dto/link-response.dto';
import { MeaningReasonDto } from './meaning-reason.dto';

export class MeaningMatchDto implements MeaningMatch {
  @ApiProperty({ type: LinkResponseDto }) link!: LinkResponseDto;
  @ApiProperty({ type: [MeaningReasonDto], maxItems: AI_SEARCH_LIMIT.WhyMax })
  why!: MeaningReasonDto[];
}
