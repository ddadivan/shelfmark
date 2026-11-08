import { ApiProperty } from '@nestjs/swagger';
import type { MergeTagRequest } from '@shelfmark/contracts';
import { IsUUID } from 'class-validator';

export class MergeTagDto implements MergeTagRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetTagId!: string;
}
