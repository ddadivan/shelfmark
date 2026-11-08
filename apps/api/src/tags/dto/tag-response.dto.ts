import { ApiProperty } from '@nestjs/swagger';
import type { GetTagResponse, TagResponse } from '@shelfmark/contracts';

export class TagResponseDto implements TagResponse, GetTagResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'to-read' })
  name!: string;

  @ApiProperty({ minimum: 0, example: 3 })
  linkCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
