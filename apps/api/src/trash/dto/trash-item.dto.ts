import { ApiProperty } from '@nestjs/swagger';
import { TRASH_ITEM_KIND, type TrashItem, type TrashItemKind } from '@shelfmark/contracts';

export class TrashItemDto implements TrashItem {
  @ApiProperty({ enum: Object.values(TRASH_ITEM_KIND) }) kind!: TrashItemKind;
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) url!: string | null;
  @ApiProperty({ nullable: true, type: String }) faviconUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) fromFolderName!: string | null;
  @ApiProperty({ nullable: true, type: Number }) linkCount!: number | null;
  @ApiProperty({ format: 'date-time' }) deletedAt!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}
