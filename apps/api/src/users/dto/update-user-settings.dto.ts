import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  TRASH_RETENTION_DAYS,
  type MotionPreference,
  type ThemePreference,
  type TrashRetentionDays,
  type UpdateUserSettingsRequest,
} from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsObject, ValidateIf, ValidateNested } from 'class-validator';
import { CustomThemeDto } from './custom-theme.dto';

// Absent is fine, but an explicit null is not (IsOptional would let it through).
const present = (_: unknown, value: unknown): boolean => value !== undefined;

export class UpdateUserSettingsDto implements UpdateUserSettingsRequest {
  @ApiPropertyOptional({ enum: TRASH_RETENTION_DAYS, example: 30 })
  @ValidateIf(present)
  @IsIn(TRASH_RETENTION_DAYS)
  trashRetentionDays?: TrashRetentionDays;

  @ApiPropertyOptional({ example: true })
  @ValidateIf(present)
  @IsBoolean()
  folderColours?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Pause history: opens are not recorded' })
  @ValidateIf(present)
  @IsBoolean()
  pauseHistory?: boolean;

  @ApiPropertyOptional({ enum: Object.values(THEME_PREFERENCE), example: THEME_PREFERENCE.Custom })
  @ValidateIf(present)
  @IsIn(Object.values(THEME_PREFERENCE))
  theme?: ThemePreference;

  @ApiPropertyOptional({ type: CustomThemeDto, description: 'Always all four fields' })
  @ValidateIf(present)
  @IsObject()
  @ValidateNested()
  @Type(() => CustomThemeDto)
  customTheme?: CustomThemeDto;

  @ApiPropertyOptional({
    enum: Object.values(MOTION_PREFERENCE),
    example: MOTION_PREFERENCE.Reduced,
    description: '`full` never overrides a device that asks for reduced motion',
  })
  @ValidateIf(present)
  @IsIn(Object.values(MOTION_PREFERENCE))
  motion?: MotionPreference;
}
