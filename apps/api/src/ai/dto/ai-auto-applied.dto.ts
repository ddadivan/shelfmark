import { ApiProperty } from '@nestjs/swagger';
import type { AiAutoApplied } from '@shelfmark/contracts';

export class AiAutoAppliedDto implements AiAutoApplied {
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) folderId!: string | null;
  @ApiProperty({ type: [String] }) tags!: string[];
}
