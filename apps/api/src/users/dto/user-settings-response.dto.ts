import { ApiProperty } from '@nestjs/swagger';
import {
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  TRASH_RETENTION_DAYS,
  type MotionPreference,
  type ThemePreference,
  type TrashRetentionDays,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { CustomThemeDto } from './custom-theme.dto';

export class UserSettingsResponseDto implements UserSettingsResponse {
  @ApiProperty({ enum: TRASH_RETENTION_DAYS, example: 30 })
  trashRetentionDays!: TrashRetentionDays;

  @ApiProperty({ example: true })
  folderColours!: boolean;

  @ApiProperty({ example: false, description: 'Pause history: opens are not recorded' })
  pauseHistory!: boolean;

  @ApiProperty({ enum: Object.values(THEME_PREFERENCE), example: THEME_PREFERENCE.System })
  theme!: ThemePreference;

  @ApiProperty({ type: CustomThemeDto })
  customTheme!: CustomThemeDto;

  @ApiProperty({ enum: Object.values(MOTION_PREFERENCE), example: MOTION_PREFERENCE.System })
  motion!: MotionPreference;

  @ApiProperty({
    example: false,
    description: 'False until theme, customTheme or motion is first saved',
  })
  appearanceSaved!: boolean;
}
