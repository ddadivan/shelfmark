import { ApiPropertyOptional } from '@nestjs/swagger';
import { NOTIFICATION_TIME_PATTERN, type UpdateNotificationSettings } from '@shelfmark/contracts';
import { IsBoolean, IsOptional, Matches, ValidateIf } from 'class-validator';

/**
 * `PATCH /api/me/notifications`: only the changed fields. A quiet hours bound is `HH:MM` or `null`;
 * the pair rule (both set or both `null`) is checked by the service against the stored value.
 * Push only: there is no email field (the weekly email is postponed), so one is a 400.
 */
export class UpdateNotificationSettingsDto implements UpdateNotificationSettings {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  reminders?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  continueReading?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: '22:00' })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Matches(NOTIFICATION_TIME_PATTERN, { message: 'quietFrom must be HH:MM' })
  quietFrom?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '08:00' })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Matches(NOTIFICATION_TIME_PATTERN, { message: 'quietTo must be HH:MM' })
  quietTo?: string | null;
}
