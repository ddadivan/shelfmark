import { ApiProperty } from '@nestjs/swagger';
import type { NotificationSettingsResponse } from '@shelfmark/contracts';
import { NotificationDeviceDto } from './notification-device.dto';
import { NotificationSettingsDto } from './notification-settings.dto';

export class NotificationSettingsResponseDto implements NotificationSettingsResponse {
  @ApiProperty({ description: 'False while the VAPID keys are not configured: nothing is sent' })
  available!: boolean;

  @ApiProperty({ type: String, nullable: true, description: 'VAPID public key, base64url' })
  publicKey!: string | null;

  @ApiProperty({ type: NotificationSettingsDto })
  settings!: NotificationSettingsDto;

  @ApiProperty({ type: [NotificationDeviceDto] })
  devices!: NotificationDeviceDto[];
}
