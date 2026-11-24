import { ApiProperty } from '@nestjs/swagger';
import { SAVED_VIEW_ICON, type SavedViewIcon, type SavedViewResponse } from '@shelfmark/contracts';
import { SavedViewQueryDto } from './saved-view-query.dto';

export class SavedViewResponseDto implements SavedViewResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: Object.values(SAVED_VIEW_ICON), nullable: true })
  icon!: SavedViewIcon | null;
  @ApiProperty({ type: SavedViewQueryDto }) query!: SavedViewQueryDto;
  @ApiProperty({ description: '0-based place among the views' }) position!: number;
  @ApiProperty({ description: 'Live links matching the query' }) count!: number;
  @ApiProperty({ description: 'false while the folder of a folder view is in Trash or gone' })
  available!: boolean;
}
