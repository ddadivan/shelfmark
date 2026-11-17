import { ApiProperty } from '@nestjs/swagger';
import type { ListRulesResponse } from '@shelfmark/contracts';
import { RuleResponseDto } from './rule-response.dto';

export class ListRulesResponseDto implements ListRulesResponse {
  @ApiProperty({ type: [RuleResponseDto] }) items!: RuleResponseDto[];
}
