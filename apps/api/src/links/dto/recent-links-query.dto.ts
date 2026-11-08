import { ApiPropertyOptional } from '@nestjs/swagger';
import { PAGE_LIMIT, type RecentLinksQuery } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RecentLinksQueryDto implements RecentLinksQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: PAGE_LIMIT.Max, default: PAGE_LIMIT.Default })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_LIMIT.Max)
  limit?: number;
}
