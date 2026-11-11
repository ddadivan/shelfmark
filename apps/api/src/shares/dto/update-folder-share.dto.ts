import { ApiProperty } from '@nestjs/swagger';
import type { UpdateFolderShareRequest } from '@shelfmark/contracts';
import { IsBoolean } from 'class-validator';

export class UpdateFolderShareDto implements UpdateFolderShareRequest {
  @ApiProperty({ description: 'Show the notes of the links to guests' })
  @IsBoolean()
  showNotes!: boolean;
}
