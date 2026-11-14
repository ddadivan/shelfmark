import { ApiProperty } from '@nestjs/swagger';
import type { RuleMatch } from '@shelfmark/contracts';

export class RuleMatchDto implements RuleMatch {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: [String] }) tags!: string[];
}
