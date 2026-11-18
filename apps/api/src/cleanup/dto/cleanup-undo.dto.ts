import { ApiProperty } from '@nestjs/swagger';
import { CLEANUP_LIMIT, type CleanupUndoRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsISO8601,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CleanupUndoMergeDto } from './cleanup-undo-merge.dto';

export class CleanupUndoDto implements CleanupUndoRequest {
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  @ValidateIf((_, value) => value !== null)
  @IsISO8601({ strict: true })
  deletedAt!: string | null;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(CLEANUP_LIMIT.ApplyGroupsMax * CLEANUP_LIMIT.GroupSizeMax)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  trashedIds!: string[];

  @ApiProperty({ type: [CleanupUndoMergeDto], maxItems: CLEANUP_LIMIT.ApplyTagMergesMax })
  @IsArray()
  @ArrayMaxSize(CLEANUP_LIMIT.ApplyTagMergesMax)
  @ValidateNested({ each: true })
  @Type(() => CleanupUndoMergeDto)
  merges!: CleanupUndoMergeDto[];
}
