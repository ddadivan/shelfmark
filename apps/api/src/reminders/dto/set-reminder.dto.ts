import { ApiProperty } from '@nestjs/swagger';
import type { SetReminderRequest } from '@shelfmark/contracts';
import { IsRemindAt } from './is-remind-at.decorator';

export class SetReminderDto implements SetReminderRequest {
  @ApiProperty({
    format: 'date-time',
    example: '2026-11-16T09:00:00.000Z',
    description: 'In the future and at most 1830 days ahead; with an offset',
  })
  @IsRemindAt()
  remindAt!: string;
}
