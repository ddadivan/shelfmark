import { ApiProperty } from '@nestjs/swagger';
import { SAVED_VIEW_LIMIT, type ReorderSavedViewsRequest } from '@shelfmark/contracts';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class ReorderSavedViewsDto implements ReorderSavedViewsRequest {
  @ApiProperty({ type: [String], format: 'uuid', maxItems: SAVED_VIEW_LIMIT.PerUserMax })
  @IsArray()
  @ArrayMaxSize(SAVED_VIEW_LIMIT.PerUserMax)
  @IsUUID('all', { each: true })
  ids!: string[];
}
