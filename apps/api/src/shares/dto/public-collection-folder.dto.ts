import { ApiProperty } from '@nestjs/swagger';
import type { PublicCollectionFolder } from '@shelfmark/contracts';

export class PublicCollectionFolderDto implements PublicCollectionFolder {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Links in this subfolder and below it' }) linkCount!: number;
}
