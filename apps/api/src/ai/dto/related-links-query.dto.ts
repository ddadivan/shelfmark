import { ApiPropertyOptional } from '@nestjs/swagger';
import { AI_SEARCH_LIMIT, type RelatedLinksQuery } from '@shelfmark/contracts';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RelatedLinksQueryDto implements RelatedLinksQuery {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: AI_SEARCH_LIMIT.RelatedMax,
    default: AI_SEARCH_LIMIT.RelatedDefault,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(AI_SEARCH_LIMIT.RelatedMax)
  limit?: number;
}
