import { ApiProperty } from '@nestjs/swagger';
import {
  TRASH_RETENTION_DAYS,
  type TrashRetentionDays,
  type UserSettingsResponse,
} from '@shelfmark/contracts';

export class UserSettingsResponseDto implements UserSettingsResponse {
  @ApiProperty({ enum: TRASH_RETENTION_DAYS, example: 30 })
  trashRetentionDays!: TrashRetentionDays;

  @ApiProperty({ example: true })
  folderColours!: boolean;

  @ApiProperty({ example: false, description: 'Pause history: opens are not recorded' })
  pauseHistory!: boolean;
}
