import { ApiProperty } from '@nestjs/swagger';
import type { DeleteLinksBatchResponse } from '@shelfmark/contracts';

export class DeleteLinksBatchResponseDto implements DeleteLinksBatchResponse {
  @ApiProperty({ description: "How many of the user's links were deleted" }) deleted!: number;
}
