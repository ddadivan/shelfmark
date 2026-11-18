import { ApiProperty } from '@nestjs/swagger';
import type { AskStatus } from '@shelfmark/contracts';
import { AskAllowanceDto } from './ask-allowance.dto';

export class AskStatusDto implements AskStatus {
  @ApiProperty({ description: 'AI on and the Ask switch on' }) available!: boolean;
  @ApiProperty({ type: AskAllowanceDto }) allowance!: AskAllowanceDto;
}
