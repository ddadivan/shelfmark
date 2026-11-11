import { ApiProperty } from '@nestjs/swagger';
import type { PublicCollectionResponse } from '@shelfmark/contracts';
import { PublicCollectionFolderDto } from './public-collection-folder.dto';
import { PublicCollectionLinkDto } from './public-collection-link.dto';

export class PublicCollectionResponseDto implements PublicCollectionResponse {
  @ApiProperty({ description: "The owner's first name only" }) ownerName!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Links in the whole shared subtree' }) linkCount!: number;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ type: [PublicCollectionFolderDto] }) subfolders!: PublicCollectionFolderDto[];
  @ApiProperty({ type: [PublicCollectionLinkDto] }) items!: PublicCollectionLinkDto[];
  @ApiProperty() page!: number;
  @ApiProperty() hasMore!: boolean;
}
