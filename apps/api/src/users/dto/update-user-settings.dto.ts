import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  TRASH_RETENTION_DAYS,
  type TrashRetentionDays,
  type UpdateUserSettingsRequest,
} from '@shelfmark/contracts';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto implements UpdateUserSettingsRequest {
  @ApiPropertyOptional({ enum: TRASH_RETENTION_DAYS, example: 30 })
  @IsOptional()
  @IsIn(TRASH_RETENTION_DAYS)
  trashRetentionDays?: TrashRetentionDays;
}
