import { ApiProperty } from '@nestjs/swagger';
import type { ReminderCountResponse } from '@shelfmark/contracts';

export class ReminderCountResponseDto implements ReminderCountResponse {
  @ApiProperty({ description: 'Live links whose reminder time has passed' }) due!: number;
}
