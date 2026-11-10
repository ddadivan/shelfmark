import { ApiProperty } from '@nestjs/swagger';
import {
  FOLDER_COLOUR,
  FOLDER_ICON,
  type FolderColour,
  type FolderIcon,
  type FolderResponse,
  type GetFolderResponse,
} from '@shelfmark/contracts';

export class FolderResponseDto implements FolderResponse, GetFolderResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) parentId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: Object.values(FOLDER_COLOUR) }) colour!: FolderColour;
  @ApiProperty({ enum: Object.values(FOLDER_ICON) }) icon!: FolderIcon;
  @ApiProperty({ description: 'Pinned to the sidebar' }) pinned!: boolean;
  @ApiProperty({ description: 'Links directly in this folder' }) linkCount!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
