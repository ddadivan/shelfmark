import { ApiProperty } from '@nestjs/swagger';
import {
  LINK_KIND,
  type GetLinkResponse,
  type LinkKind,
  type LinkResponse,
  type OpenLinkResponse,
} from '@shelfmark/contracts';

export class LinkResponseDto implements LinkResponse, GetLinkResponse, OpenLinkResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: Object.values(LINK_KIND) }) kind!: LinkKind;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) folderId!: string | null;
  @ApiProperty() url!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Always null until #149' })
  faviconUrl!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Always null until #149' })
  imageUrl!: string | null;
  @ApiProperty() isFavorite!: boolean;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) pinnedInFolderAt!:
    string | null;
  @ApiProperty({ description: 'Pinned to the sidebar' }) pinned!: boolean;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) lastOpenedAt!: string | null;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
