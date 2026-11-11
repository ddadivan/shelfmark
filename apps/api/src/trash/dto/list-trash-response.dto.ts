import { ApiProperty } from '@nestjs/swagger';
import {
  TRASH_RETENTION_DAYS,
  type ListTrashResponse,
  type TrashRetentionDays,
} from '@shelfmark/contracts';
import { TrashItemDto } from './trash-item.dto';

export class ListTrashResponseDto implements ListTrashResponse {
  @ApiProperty({ type: [TrashItemDto] }) items!: TrashItemDto[];
  @ApiProperty({ minimum: 0 }) total!: number;
  @ApiProperty({ enum: TRASH_RETENTION_DAYS }) retentionDays!: TrashRetentionDays;
}
