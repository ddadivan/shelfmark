import { ApiPropertyOptional } from '@nestjs/swagger';
import type { TidyListQuery } from '@shelfmark/contracts';
import { IsOptional, IsUUID } from 'class-validator';

/** `GET /api/ai/tidy` query: the next page starts after this link of the previous page. */
export class TidyListQueryDto implements TidyListQuery {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'The last link of the previous page; ignored when it is not one of yours',
  })
  @IsOptional()
  @IsUUID()
  after?: string;
}
