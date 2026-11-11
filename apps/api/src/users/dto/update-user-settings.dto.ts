import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  TRASH_RETENTION_DAYS,
  type TrashRetentionDays,
  type UpdateUserSettingsRequest,
} from '@shelfmark/contracts';
import { IsBoolean, IsIn, ValidateIf } from 'class-validator';

export class UpdateUserSettingsDto implements UpdateUserSettingsRequest {
  @ApiPropertyOptional({ enum: TRASH_RETENTION_DAYS, example: 30 })
  // Absent is fine, but an explicit null is not (IsOptional would let it through).
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsIn(TRASH_RETENTION_DAYS)
  trashRetentionDays?: TrashRetentionDays;

  @ApiPropertyOptional({ example: true })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  folderColours?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Pause history: opens are not recorded' })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  pauseHistory?: boolean;
}
