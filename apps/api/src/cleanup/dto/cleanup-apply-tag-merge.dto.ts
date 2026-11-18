import { ApiProperty } from '@nestjs/swagger';
import type { CleanupApplyTagMerge } from '@shelfmark/contracts';
import { IsString, IsUUID, Matches } from 'class-validator';

export class CleanupApplyTagMergeDto implements CleanupApplyTagMerge {
  @ApiProperty({ description: 'A similar-tags pair id of the stored report' })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,32}$/)
  pairId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Either tag of the pair; the other is merged into it',
  })
  @IsUUID()
  keepTagId!: string;
}
