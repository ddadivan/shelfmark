import { ApiProperty } from '@nestjs/swagger';
import type { ListSavedViewsResponse } from '@shelfmark/contracts';
import { SavedViewResponseDto } from './saved-view-response.dto';

export class ListSavedViewsResponseDto implements ListSavedViewsResponse {
  @ApiProperty({ type: [SavedViewResponseDto] }) items!: SavedViewResponseDto[];
  @ApiProperty({ description: 'All live links: the count of the fixed "All" chip' }) total!: number;
}
