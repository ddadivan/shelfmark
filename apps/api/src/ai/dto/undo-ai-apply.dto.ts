import { ApiProperty } from '@nestjs/swagger';
import { AI_APPLIED_PART, type AiAppliedPart, type UndoAiApplyRequest } from '@shelfmark/contracts';
import { IsIn } from 'class-validator';

export class UndoAiApplyDto implements UndoAiApplyRequest {
  @ApiProperty({ enum: Object.values(AI_APPLIED_PART) })
  @IsIn(Object.values(AI_APPLIED_PART))
  part!: AiAppliedPart;
}
