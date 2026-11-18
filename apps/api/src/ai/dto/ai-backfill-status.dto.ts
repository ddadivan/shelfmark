import { ApiProperty } from '@nestjs/swagger';
import {
  AI_BACKFILL_STATE,
  type AiBackfillState,
  type AiBackfillStatus,
} from '@shelfmark/contracts';

export class AiBackfillStatusDto implements AiBackfillStatus {
  @ApiProperty({ enum: Object.values(AI_BACKFILL_STATE) }) state!: AiBackfillState;
  @ApiProperty() eligible!: number;
  @ApiProperty() total!: number;
  @ApiProperty() done!: number;
  @ApiProperty({ nullable: true, type: Number }) estimatedMinutes!: number | null;
}
