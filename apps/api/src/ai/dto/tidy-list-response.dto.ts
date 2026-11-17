import { ApiProperty } from '@nestjs/swagger';
import { TIDY_LIMIT, type TidyListResponse } from '@shelfmark/contracts';
import { TidyItemDto } from './tidy-item.dto';

export class TidyListResponseDto implements TidyListResponse {
  @ApiProperty({ type: [TidyItemDto], maxItems: TIDY_LIMIT.PageMax, description: 'Newest first' })
  items!: TidyItemDto[];
  @ApiProperty({ description: 'All links in Unsorted with suggestions to review' }) total!: number;
}
