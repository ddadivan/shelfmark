import { ApiProperty } from '@nestjs/swagger';
import type { SavedViewResponse } from '@shelfmark/contracts';
import { SavedViewQueryDto } from './saved-view-query.dto';

export class SavedViewResponseDto implements SavedViewResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: SavedViewQueryDto }) query!: SavedViewQueryDto;
  @ApiProperty({ description: '0-based place among the views' }) position!: number;
  @ApiProperty({ description: 'Live links matching the query' }) count!: number;
  @ApiProperty({ description: 'false while the folder of a folder view is in Trash or gone' })
  available!: boolean;
}
