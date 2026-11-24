import { ApiProperty } from '@nestjs/swagger';
import type { NotificationTestResponse } from '@shelfmark/contracts';

export class NotificationTestResponseDto implements NotificationTestResponse {
  @ApiProperty({ minimum: 0, example: 2 })
  sent!: number;
}
