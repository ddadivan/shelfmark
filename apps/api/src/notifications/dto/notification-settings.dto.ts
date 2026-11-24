import { ApiProperty } from '@nestjs/swagger';
import type { NotificationSettings } from '@shelfmark/contracts';

export class NotificationSettingsDto implements NotificationSettings {
  @ApiProperty({ example: true })
  reminders!: boolean;

  @ApiProperty({ example: false })
  continueReading!: boolean;

  @ApiProperty({ type: String, nullable: true, example: '22:00' })
  quietFrom!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '08:00' })
  quietTo!: string | null;
}
