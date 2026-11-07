import { ApiProperty } from '@nestjs/swagger';
import type { FolderResponse } from '@shelfmark/contracts';

export class FolderResponseDto implements FolderResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) parentId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Links directly in this folder' }) linkCount!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
