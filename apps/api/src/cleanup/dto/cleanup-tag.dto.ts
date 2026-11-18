import { ApiProperty } from '@nestjs/swagger';
import type { CleanupTag } from '@shelfmark/contracts';

export class CleanupTagDto implements CleanupTag {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ minimum: 0, description: 'Live links carrying the tag' }) links!: number;
}
