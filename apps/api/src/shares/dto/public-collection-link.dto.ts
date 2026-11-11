import { ApiProperty } from '@nestjs/swagger';
import type { PublicCollectionLink } from '@shelfmark/contracts';

export class PublicCollectionLinkDto implements PublicCollectionLink {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true, description: 'null unless notes are shown' })
  note!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Same-origin path or null' })
  faviconUrl!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Same-origin path or null' })
  imageUrl!: string | null;
}
