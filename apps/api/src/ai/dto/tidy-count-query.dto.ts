import { ApiPropertyOptional } from '@nestjs/swagger';
import type { TidyListQuery } from '@shelfmark/contracts';
import { IsOptional, IsUUID } from 'class-validator';

/** `GET /api/ai/tidy/count` query: the same `import` scope as the list. */
export class TidyCountQueryDto implements Pick<TidyListQuery, 'import'> {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Counts only the links of this import of yours, in any folder',
  })
  @IsOptional()
  @IsUUID()
  import?: string;
}
