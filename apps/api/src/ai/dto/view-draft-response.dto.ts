import { ApiProperty } from '@nestjs/swagger';
import {
  VIEW_DRAFT_OUTCOME,
  type ViewDraftOutcome,
  type ViewDraftResponse,
} from '@shelfmark/contracts';
import { AskAllowanceDto } from './ask-allowance.dto';
import { ViewDraftDto } from './view-draft.dto';

export class ViewDraftResponseDto implements ViewDraftResponse {
  @ApiProperty({ enum: Object.values(VIEW_DRAFT_OUTCOME) }) outcome!: ViewDraftOutcome;
  @ApiProperty({ type: ViewDraftDto, nullable: true }) draft!: ViewDraftDto | null;
  @ApiProperty({ type: AskAllowanceDto }) allowance!: AskAllowanceDto;
}
