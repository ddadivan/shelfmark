import { ApiProperty } from '@nestjs/swagger';
import type { ListRemindersResponse } from '@shelfmark/contracts';
import { LinkResponseDto } from '../../links/dto/link-response.dto';

export class ListRemindersResponseDto implements ListRemindersResponse {
  @ApiProperty({ type: [LinkResponseDto], description: 'Due links, the longest due first' })
  due!: LinkResponseDto[];
  @ApiProperty({ type: [LinkResponseDto], description: 'Upcoming reminders, the soonest first' })
  upcoming!: LinkResponseDto[];
}
