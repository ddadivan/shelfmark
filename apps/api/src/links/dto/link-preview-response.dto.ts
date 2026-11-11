import { ApiProperty } from '@nestjs/swagger';
import {
  LINK_KIND,
  type LinkDuplicate,
  type LinkKind,
  type LinkPreview,
  type LinkPreviewResponse,
} from '@shelfmark/contracts';

export class LinkPreviewDto implements LinkPreview {
  @ApiProperty({ enum: Object.values(LINK_KIND) }) kind!: LinkKind;
  @ApiProperty() url!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) faviconUrl!: string | null;
}

export class LinkDuplicateDto implements LinkDuplicate {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) folderId!: string | null;
  @ApiProperty({ nullable: true, type: String }) folderName!: string | null;
}

export class LinkPreviewResponseDto implements LinkPreviewResponse {
  @ApiProperty({ type: LinkPreviewDto }) preview!: LinkPreviewDto;
  @ApiProperty({ type: LinkDuplicateDto, nullable: true }) duplicate!: LinkDuplicateDto | null;
  @ApiProperty({ description: 'false when the page could not be fetched' }) fetched!: boolean;
}
