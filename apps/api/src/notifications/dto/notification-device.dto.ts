import { ApiProperty } from '@nestjs/swagger';
import type { NotificationDevice } from '@shelfmark/contracts';

/** A device with push on. Never carries the endpoint or keys. */
export class NotificationDeviceDto implements NotificationDevice {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Chrome on macOS' })
  name!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastUsedAt!: string | null;
}
