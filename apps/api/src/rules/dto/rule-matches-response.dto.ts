import { ApiProperty } from '@nestjs/swagger';
import type { RuleMatchesResponse } from '@shelfmark/contracts';
import { RuleMatchDto } from './rule-match.dto';

export class RuleMatchesResponseDto implements RuleMatchesResponse {
  @ApiProperty({ type: [RuleMatchDto], description: 'At most LINK_LIMIT.BatchMax, newest first' })
  items!: RuleMatchDto[];
  @ApiProperty({ description: 'Every matching live link in Unsorted' }) total!: number;
}
