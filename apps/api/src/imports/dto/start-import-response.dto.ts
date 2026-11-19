import { ApiProperty } from '@nestjs/swagger';
import type { StartImportResponse } from '@shelfmark/contracts';
import { ImportFolderIdDto } from './import-folder-id.dto';

export class StartImportResponseDto implements StartImportResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Where links without a folder go; null = Unsorted',
  })
  targetFolderId!: string | null;

  @ApiProperty({ type: [ImportFolderIdDto] }) folders!: ImportFolderIdDto[];
}
