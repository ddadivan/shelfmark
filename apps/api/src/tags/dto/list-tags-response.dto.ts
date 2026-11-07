import { ApiProperty } from '@nestjs/swagger';
import type { ListTagsResponse } from '@shelfmark/contracts';
import { TagResponseDto } from './tag-response.dto';

export class ListTagsResponseDto implements ListTagsResponse {
  @ApiProperty({ type: [TagResponseDto] })
  items!: TagResponseDto[];
}
