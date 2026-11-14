import { ApiProperty } from '@nestjs/swagger';
import {
  LINK_BATCH_ERROR_CODE,
  type LinkBatchErrorCode,
  type LinkBatchItemError,
} from '@shelfmark/contracts';

export class LinkBatchItemErrorDto implements LinkBatchItemError {
  @ApiProperty({ description: 'Position of the item in the request' }) index!: number;
  @ApiProperty() url!: string;
  @ApiProperty({ enum: Object.values(LINK_BATCH_ERROR_CODE) }) code!: LinkBatchErrorCode;
}
