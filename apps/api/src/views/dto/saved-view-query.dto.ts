import { ApiProperty } from '@nestjs/swagger';
import {
  LINK_KIND,
  LINK_SORT_FIELD,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  type LinkKind,
  type LinkSortField,
  type SavedViewQuery,
  type SavedViewScope,
  type SortOrder,
} from '@shelfmark/contracts';

export class SavedViewQueryDto implements SavedViewQuery {
  @ApiProperty({ enum: Object.values(SAVED_VIEW_SCOPE) }) scope!: SavedViewScope;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) folderId!: string | null;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ enum: Object.values(LINK_KIND), nullable: true }) kind!: LinkKind | null;
  @ApiProperty({ enum: Object.values(LINK_SORT_FIELD) }) sort!: LinkSortField;
  @ApiProperty({ enum: Object.values(SORT_ORDER) }) order!: SortOrder;
  @ApiProperty() q!: string;
}
