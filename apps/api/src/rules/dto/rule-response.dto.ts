import { ApiProperty } from '@nestjs/swagger';
import type { RuleResponse } from '@shelfmark/contracts';

export class RuleResponseDto implements RuleResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'youtube.com' }) domain!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) folderId!: string | null;
  @ApiProperty({ description: 'false only while the target folder is in Trash' })
  folderAvailable!: boolean;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
