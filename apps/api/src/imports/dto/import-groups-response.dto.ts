import { ApiProperty } from '@nestjs/swagger';
import type { ImportGroupsResponse } from '@shelfmark/contracts';
import { ImportGroupDto } from './import-group.dto';

export class ImportGroupsResponseDto implements ImportGroupsResponse {
  @ApiProperty({ type: [ImportGroupDto], description: 'Largest first' })
  groups!: ImportGroupDto[];

  @ApiProperty({ type: [Number], description: 'Indexes that fit no topic' })
  rest!: number[];

  @ApiProperty({ description: 'Links taken from the allowance for existing links' })
  charged!: number;
}
