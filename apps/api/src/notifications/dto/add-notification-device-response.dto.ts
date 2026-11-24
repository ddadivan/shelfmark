import { ApiProperty } from '@nestjs/swagger';
import type { AddNotificationDeviceResponse } from '@shelfmark/contracts';
import { NotificationSettingsResponseDto } from './notification-settings-response.dto';

export class AddNotificationDeviceResponseDto
  extends NotificationSettingsResponseDto
  implements AddNotificationDeviceResponse
{
  @ApiProperty({ format: 'uuid', description: 'The device just added (or refreshed)' })
  deviceId!: string;
}
