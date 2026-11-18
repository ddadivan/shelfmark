import { ApiProperty } from '@nestjs/swagger';
import { CLEANUP_STATE, type CleanupReport, type CleanupState } from '@shelfmark/contracts';
import { CleanupDuplicateGroupDto } from './cleanup-duplicate-group.dto';
import { CleanupTagPairDto } from './cleanup-tag-pair.dto';

export class CleanupReportDto implements CleanupReport {
  @ApiProperty({ enum: Object.values(CLEANUP_STATE) }) state!: CleanupState;
  @ApiProperty({ minimum: 0 }) checked!: number;
  @ApiProperty({ minimum: 0 }) total!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) checkedAt!: string | null;
  @ApiProperty() aiIncluded!: boolean;
  @ApiProperty() aiAvailable!: boolean;
  @ApiProperty({ type: [CleanupDuplicateGroupDto] }) duplicates!: CleanupDuplicateGroupDto[];
  @ApiProperty({ type: [CleanupTagPairDto] }) similarTags!: CleanupTagPairDto[];
}
