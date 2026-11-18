import { ApiProperty } from '@nestjs/swagger';
import { CLEANUP_LIMIT, type CleanupApplyRequest } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { CleanupApplyDuplicateDto } from './cleanup-apply-duplicate.dto';
import { CleanupApplyTagMergeDto } from './cleanup-apply-tag-merge.dto';

export class CleanupApplyDto implements CleanupApplyRequest {
  @ApiProperty({ type: [CleanupApplyDuplicateDto], maxItems: CLEANUP_LIMIT.ApplyGroupsMax })
  @IsArray()
  @ArrayMaxSize(CLEANUP_LIMIT.ApplyGroupsMax)
  @ValidateNested({ each: true })
  @Type(() => CleanupApplyDuplicateDto)
  duplicates!: CleanupApplyDuplicateDto[];

  @ApiProperty({ type: [CleanupApplyTagMergeDto], maxItems: CLEANUP_LIMIT.ApplyTagMergesMax })
  @IsArray()
  @ArrayMaxSize(CLEANUP_LIMIT.ApplyTagMergesMax)
  @ValidateNested({ each: true })
  @Type(() => CleanupApplyTagMergeDto)
  tagMerges!: CleanupApplyTagMergeDto[];
}
