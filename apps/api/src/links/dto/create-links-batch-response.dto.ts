import { ApiProperty } from '@nestjs/swagger';
import type { CreateLinksBatchResponse } from '@shelfmark/contracts';
import { LinkBatchItemErrorDto } from './link-batch-item-error.dto';
import { LinkResponseDto } from './link-response.dto';

export class CreateLinksBatchResponseDto implements CreateLinksBatchResponse {
  @ApiProperty({
    type: [LinkResponseDto],
    description: 'Saved links in request order (created now or replayed by key)',
  })
  links!: LinkResponseDto[];

  @ApiProperty({ type: [LinkBatchItemErrorDto], description: 'Skipped items in request order' })
  errors!: LinkBatchItemErrorDto[];
}
