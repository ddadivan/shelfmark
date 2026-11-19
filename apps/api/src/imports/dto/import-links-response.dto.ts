import { ApiProperty } from '@nestjs/swagger';
import type { ImportLinksResponse } from '@shelfmark/contracts';
import { LinkBatchItemErrorDto } from '../../links/dto/link-batch-item-error.dto';

export class ImportLinksResponseDto implements ImportLinksResponse {
  @ApiProperty({ description: 'Links this request created' }) created!: number;
  @ApiProperty({ description: 'Links an earlier try of the same batch had created' })
  replayed!: number;
  @ApiProperty({ type: [LinkBatchItemErrorDto], description: 'Items that were not saved' })
  errors!: LinkBatchItemErrorDto[];
}
