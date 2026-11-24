import { ApiProperty } from '@nestjs/swagger';
import type { NotificationDeliveryResponse } from '../models/notification-delivery-response.interface';

export class NotificationDeliveryResponseDto implements NotificationDeliveryResponse {
  @ApiProperty({ example: true })
  configured!: boolean;

  @ApiProperty({ minimum: 0, example: 4 })
  sent!: number;

  @ApiProperty({ minimum: 0, example: 1 })
  removed!: number;

  @ApiProperty({ minimum: 0, example: 0 })
  quiet!: number;

  @ApiProperty({ example: false })
  hasMore!: boolean;
}
