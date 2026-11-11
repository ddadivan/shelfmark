import { ApiProperty } from '@nestjs/swagger';
import type { TrashActionResponse } from '@shelfmark/contracts';

export class TrashActionResponseDto implements TrashActionResponse {
  @ApiProperty({ minimum: 0, description: 'Entries handled; entries not in Trash are skipped' })
  count!: number;
}
