import { ApiProperty } from '@nestjs/swagger';
import { SHARE_LIMIT, type FolderShareResponse } from '@shelfmark/contracts';

export class FolderShareResponseDto implements FolderShareResponse {
  @ApiProperty({ format: 'uuid' }) folderId!: string;
  @ApiProperty({ description: 'The folder has a public link' }) enabled!: boolean;
  @ApiProperty({
    type: String,
    nullable: true,
    minLength: SHARE_LIMIT.TokenLength,
    maxLength: SHARE_LIMIT.TokenLength,
    description: 'The token of the public URL /c/{token}; null when not shared',
  })
  token!: string | null;
  @ApiProperty({ description: 'Guests see the notes' }) showNotes!: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  createdAt!: string | null;
}
