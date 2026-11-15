import { ApiProperty } from '@nestjs/swagger';
import {
  FOLDER_COLOUR,
  FOLDER_ICON,
  HEX_COLOUR_PATTERN,
  type FolderColour,
  type FolderEmoji,
  type FolderIcon,
  type HexColour,
  type FolderResponse,
  type GetFolderResponse,
} from '@shelfmark/contracts';

export class FolderResponseDto implements FolderResponse, GetFolderResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) parentId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({
    oneOf: [
      { type: 'string', enum: Object.values(FOLDER_COLOUR) },
      { type: 'string', pattern: HEX_COLOUR_PATTERN.source },
    ],
  })
  colour!: FolderColour | HexColour;
  @ApiProperty({
    oneOf: [{ type: 'string', enum: Object.values(FOLDER_ICON) }, { type: 'string' }],
    description: 'An icon name or exactly one emoji',
  })
  icon!: FolderIcon | FolderEmoji;
  @ApiProperty({ type: String, nullable: true, description: 'Short description (#418)' })
  description!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Cover link (#418)' })
  coverLinkId!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: "Same-origin path of the cover link's preview image",
  })
  coverUrl!: string | null;
  @ApiProperty({ description: 'Place among its siblings, 0 first (manual order)' })
  position!: number;
  @ApiProperty({ description: 'Pinned to the sidebar' }) pinned!: boolean;
  @ApiProperty({ description: 'Links directly in this folder' }) linkCount!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
