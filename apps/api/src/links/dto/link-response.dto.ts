import { ApiProperty } from '@nestjs/swagger';
import {
  AI_JOB_STATUS,
  LINK_KIND,
  SUMMARY_SOURCE,
  type AiJobStatus,
  type SummarySource,
  type GetLinkResponse,
  type LinkKind,
  type LinkResponse,
} from '@shelfmark/contracts';

export class LinkResponseDto implements LinkResponse, GetLinkResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: Object.values(LINK_KIND) }) kind!: LinkKind;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) folderId!: string | null;
  @ApiProperty() url!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Always null until #149' })
  faviconUrl!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Always null until #149' })
  imageUrl!: string | null;
  @ApiProperty() isFavorite!: boolean;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) pinnedInFolderAt!:
    string | null;
  @ApiProperty({ description: 'Pinned to the sidebar' }) pinned!: boolean;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) lastOpenedAt!: string | null;
  @ApiProperty({
    format: 'date-time',
    nullable: true,
    type: String,
    description: 'Reminder time; due once it has passed',
  })
  remindAt!: string | null;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ nullable: true, type: String, description: 'Short summary, plain text' })
  summary!: string | null;
  @ApiProperty({ enum: Object.values(SUMMARY_SOURCE), nullable: true, type: String })
  summarySource!: SummarySource | null;
  @ApiProperty({
    enum: Object.values(AI_JOB_STATUS),
    nullable: true,
    type: String,
    description: 'Latest AI job of the link; null when AI never ran for it',
  })
  aiStatus!: AiJobStatus | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
