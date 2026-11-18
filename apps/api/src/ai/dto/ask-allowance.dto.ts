import { ApiProperty } from '@nestjs/swagger';
import { ASK_PERIOD, type AskAllowance, type AskPeriod } from '@shelfmark/contracts';

export class AskAllowanceDto implements AskAllowance {
  @ApiProperty({ minimum: 0 }) questionsLeft!: number;
  @ApiProperty({ enum: Object.values(ASK_PERIOD), description: 'The closer limit' })
  period!: AskPeriod;
  @ApiProperty({ example: '2026-11-18', description: 'UTC date the period resets' })
  resetsOn!: string;
}
