import { ApiProperty } from '@nestjs/swagger';
import type { ImportFolderId } from '@shelfmark/contracts';

export class ImportFolderIdDto implements ImportFolderId {
  @ApiProperty() key!: string;
  @ApiProperty({ format: 'uuid' }) id!: string;
}
